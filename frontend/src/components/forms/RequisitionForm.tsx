import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { createRequisition } from "../../api/requisitionApi";
import { getExperimentPlanningStatus } from "../../api/iaecApi";
import {
  getApprovedProtocolOptions,
  getApprovedSpeciesOptions,
  getApprovedStrainsOptions,
  type LookupOption,
} from "../../api/lookupApi";
import { getFormBDetails, type FormBDetails } from "../../api/formbApi";
import { getApiErrorMessage } from "../../api/errors";
import type { AnimalRequisition, ExperimentPlanningStatus, User } from "../../api/types";
import { useLookupOptions } from "../../hooks/useLookupOptions";
import { useSubmitState } from "../../hooks/useSubmitState";
import { ErrorAlert } from "../common/ErrorAlert";
import { LookupSelectField } from "../common/LookupSelectField";
import { SuccessNote } from "../common/SuccessNote";
import { formatDisplayDate } from "../../utils/dateFormat";
import { validateDateOnOrAfter } from "../../utils/businessValidation";

const itemSchema = z.object({
  species_id: z.coerce.number().int().positive(),
  strain_id: z.coerce.number().int().positive(),
  requested_count: z.coerce.number().int().positive(),
});

const schema = z.object({
  protocol_id: z.coerce.number().int().positive(),
  date: z.string().min(1),
  purpose: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

type FormValues = z.infer<typeof schema>;

interface RequisitionFormProps {
  currentUser: User;
  onCreated: (value: AnimalRequisition) => void;
  defaultProtocolId?: number;
}

export function RequisitionForm({ currentUser, onCreated, defaultProtocolId }: RequisitionFormProps) {
  const { register, control, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      protocol_id: defaultProtocolId ?? 0,
      date: "",
      purpose: "",
      items: [{ species_id: 0, strain_id: 0, requested_count: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const [protocolDetails, setProtocolDetails] = useState<FormBDetails | null>(null);
  const [planningStatus, setPlanningStatus] = useState<ExperimentPlanningStatus | null>(null);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [protocolDetailsLoading, setProtocolDetailsLoading] = useState(false);
  const [protocolDetailsError, setProtocolDetailsError] = useState<string | null>(null);
  const [strainOptionsByIndex, setStrainOptionsByIndex] = useState<Record<number, LookupOption[]>>({});
  const [strainLoadingByIndex, setStrainLoadingByIndex] = useState<Record<number, boolean>>({});
  const [strainErrorByIndex, setStrainErrorByIndex] = useState<Record<number, string | null>>({});
  const protocolLookup = useLookupOptions(getApprovedProtocolOptions);
  const speciesLookup = useLookupOptions(getApprovedSpeciesOptions);
  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

  const selectedProtocolId = watch("protocol_id");
  const watchedItems = watch("items");
  const watchedDate = watch("date");
  const minRequisitionDate = protocolDetails?.approval_date ?? undefined;
  const dateValidationError =
    watchedDate && minRequisitionDate
      ? validateDateOnOrAfter(
          watchedDate,
          minRequisitionDate,
          "Requisition date",
          "IAEC approval date",
        )
      : null;

  useEffect(() => {
    if (defaultProtocolId && defaultProtocolId > 0) {
      setValue("protocol_id", defaultProtocolId, { shouldValidate: true });
    }
  }, [defaultProtocolId, setValue]);

  useEffect(() => {
    fields.forEach((_, index) => {
      const speciesId = watchedItems?.[index]?.species_id;
      if (!speciesId || speciesId <= 0) {
        setStrainOptionsByIndex((prev) => ({ ...prev, [index]: [] }));
        setStrainErrorByIndex((prev) => ({ ...prev, [index]: null }));
        return;
      }

      void (async () => {
        try {
          setStrainLoadingByIndex((prev) => ({ ...prev, [index]: true }));
          setStrainErrorByIndex((prev) => ({ ...prev, [index]: null }));
          const options = await getApprovedStrainsOptions(speciesId);
          setStrainOptionsByIndex((prev) => ({ ...prev, [index]: options }));
        } catch (error) {
          setStrainErrorByIndex((prev) => ({ ...prev, [index]: getApiErrorMessage(error) }));
          setStrainOptionsByIndex((prev) => ({ ...prev, [index]: [] }));
        } finally {
          setStrainLoadingByIndex((prev) => ({ ...prev, [index]: false }));
        }
      })();
    });
  }, [fields, watchedItems]);

  useEffect(() => {
    async function loadProtocolDetails() {
      if (!selectedProtocolId || selectedProtocolId <= 0) {
        setProtocolDetails(null);
        setProtocolDetailsError(null);
        setPlanningStatus(null);
        setPlanningError(null);
        return;
      }

      try {
        setProtocolDetailsLoading(true);
        setProtocolDetailsError(null);
        const details = await getFormBDetails(selectedProtocolId);
        setProtocolDetails(details);
        if (details.purpose) {
          setValue("purpose", details.purpose, { shouldValidate: true });
        }
      } catch (error) {
        setProtocolDetailsError(getApiErrorMessage(error));
        setProtocolDetails(null);
      } finally {
        setProtocolDetailsLoading(false);
      }
    }

    void loadProtocolDetails();
  }, [selectedProtocolId, setValue]);

  useEffect(() => {
    async function loadPlanningStatus() {
      if (!selectedProtocolId || selectedProtocolId <= 0) {
        setPlanningStatus(null);
        setPlanningError(null);
        return;
      }

      try {
        setPlanningLoading(true);
        setPlanningError(null);
        const status = await getExperimentPlanningStatus(selectedProtocolId);
        setPlanningStatus(status);
      } catch (error) {
        setPlanningError(getApiErrorMessage(error));
        setPlanningStatus(null);
      } finally {
        setPlanningLoading(false);
      }
    }

    void loadPlanningStatus();
  }, [selectedProtocolId]);

  const requestedTotal = (watchedItems ?? []).reduce(
    (sum, item) => sum + (Number(item?.requested_count) || 0),
    0,
  );
  const requisitionBlocked = Boolean(planningStatus && !planningStatus.can_create_requisition);
  const exceedsPlannedTotal = Boolean(
    planningStatus &&
      planningStatus.planned_animal_total > 0 &&
      requestedTotal > planningStatus.planned_animal_total,
  );

  const onSubmit = handleSubmit(async (values) => {
    start();
    const dateError = validateDateOnOrAfter(
      values.date,
      minRequisitionDate,
      "Requisition date",
      "IAEC approval date",
    );
    if (dateError) {
      fail(dateError);
      return;
    }
    try {
      const created = await createRequisition({
        ...values,
        requester_name: currentUser.name ?? currentUser.email,
        requester_role: currentUser.roles[0] ?? "investigator",
      });
      onCreated(created);
      succeed(`Requisition created with id ${created.id}`);
      reset({
        protocol_id: 0,
        date: "",
        purpose: "",
        items: [{ species_id: 0, strain_id: 0, requested_count: 1 }],
      });
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <LookupSelectField
        label="Protocol"
        value={watch("protocol_id")}
        onChange={(value) => setValue("protocol_id", value, { shouldValidate: true })}
        options={protocolLookup.options}
        loading={protocolLookup.isLoading}
        error={protocolLookup.error}
        placeholder="Select protocol"
        loadingLabel="Loading protocols..."
        fieldError={errors.protocol_id?.message}
      />
      <label>
        Date
        <input type="date" min={minRequisitionDate} {...register("date")} />
        {minRequisitionDate ? (
          <small>Must be on or after IAEC approval ({formatDisplayDate(minRequisitionDate)}).</small>
        ) : null}
        {dateValidationError ? <small className="field-error">{dateValidationError}</small> : null}
      </label>
      <label className="full-width">
        Purpose
        <textarea {...register("purpose")} rows={2} />
      </label>

      <div className="full-width info-card compact-info-card">
        <strong>Requester Bound From Session</strong>
        <p>{currentUser.name ?? currentUser.email}</p>
        <p>{currentUser.roles.join(", ")}</p>
      </div>

      {protocolDetailsLoading ? <small className="full-width">Loading protocol details...</small> : null}
      {protocolDetailsError ? <small className="field-error full-width">{protocolDetailsError}</small> : null}
      {protocolDetails ? (
        <div className="full-width info-card">
          <strong>Protocol Details </strong>
          <p>Title: {protocolDetails.title ?? "-"}</p>
          <p>Protocol Number: {protocolDetails.protocol_number ?? "-"}</p>
          <p>Approval Date: {formatDisplayDate(protocolDetails.approval_date, "-")}</p>
          <p>Principal Investigator: {protocolDetails.principal_investigator ?? "-"}</p>
        </div>
      ) : null}

      {planningLoading ? <small className="full-width">Loading experiment group planning...</small> : null}
      {planningError ? <small className="field-error full-width">{planningError}</small> : null}
      {planningStatus ? (
        <div className={`full-width info-card ${requisitionBlocked ? "warning-card" : ""}`}>
          <strong>Experiment Group Planning</strong>
          <p>Approved animals: {planningStatus.approved_animal_count ?? "-"}</p>
          <p>Planned across groups: {planningStatus.planned_animal_total}</p>
          <p>Groups defined: {planningStatus.group_count}</p>
          <p>{planningStatus.message ?? "Planning status unavailable."}</p>
          {exceedsPlannedTotal ? (
            <p className="field-error">
              Requested total ({requestedTotal}) exceeds planned total ({planningStatus.planned_animal_total}).
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="full-width subform-header">
        <h3>Items</h3>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => append({ species_id: 0, strain_id: 0, requested_count: 1 })}
        >
          Add Item
        </button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="item-row full-width">
          <label>
            Species
            <select
              value={watch(`items.${index}.species_id`) || ""}
              onChange={(event) => {
                setValue(`items.${index}.species_id`, Number(event.target.value), { shouldValidate: true });
              }}
              disabled={speciesLookup.isLoading || Boolean(speciesLookup.error)}
            >
              <option value="">
                {speciesLookup.isLoading ? "Loading species..." : "Select species"}
              </option>
              {speciesLookup.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {speciesLookup.error ? <small className="field-error">{speciesLookup.error}</small> : null}
            {errors.items?.[index]?.species_id ? (
              <small className="field-error">{errors.items[index]?.species_id?.message}</small>
            ) : null}
          </label>
          <label>
            Strain
            <select
              value={watch(`items.${index}.strain_id`) || ""}
              onChange={(event) => {
                setValue(`items.${index}.strain_id`, Number(event.target.value), { shouldValidate: true });
              }}
              disabled={Boolean(strainLoadingByIndex[index]) || Boolean(strainErrorByIndex[index])}
            >
              <option value="">
                {strainLoadingByIndex[index] ? "Loading strains..." : "Select strain"}
              </option>
              {(strainOptionsByIndex[index] ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {strainErrorByIndex[index] ? <small className="field-error">{strainErrorByIndex[index]}</small> : null}
            {errors.items?.[index]?.strain_id ? (
              <small className="field-error">{errors.items[index]?.strain_id?.message}</small>
            ) : null}
          </label>
          <label>
            Requested Count
            <input
              type="number"
              min={1}
              step={1}
              onWheel={(event) => event.currentTarget.blur()}
              {...register(`items.${index}.requested_count`)}
            />
          </label>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => remove(index)}
            disabled={fields.length === 1}
          >
            Remove
          </button>
        </div>
    
  
 ))}

      {errors.items ? <small className="field-error full-width">Please add valid requisition items.</small> : null}

      <button
        className="btn"
        type="submit"
        disabled={isSubmitting || requisitionBlocked || exceedsPlannedTotal}
      >
        Create Requisition
      </button>

      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {successMessage ? <SuccessNote message={successMessage} /> : null}
    </form>
  );
}