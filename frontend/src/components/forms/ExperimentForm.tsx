import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { createExperiment } from "../../api/experimentApi";
import { getGroupsByProject } from "../../api/iaecApi";
import {
  getApprovedAllocationOptions,
  getApprovedAnimalOptions,
  getApprovedProtocolOptions,
  type LookupOption,
} from "../../api/lookupApi";

import { getFormBDetails, type FormBDetails } from "../../api/formbApi";
import { getFormDDetails, type FormDDetails } from "../../api/formdApi";
import { getAllocation } from "../../api/requisitionApi";
import { getApiErrorMessage } from "../../api/errors";

import type { Experiment, ExperimentGroup } from "../../api/types";

import { useLookupOptions } from "../../hooks/useLookupOptions";
import { useSubmitState } from "../../hooks/useSubmitState";
import { formatDisplayDate } from "../../utils/dateFormat";
import { latestIsoDate, validateDateOnOrAfter } from "../../utils/businessValidation";

import { ErrorAlert } from "../common/ErrorAlert";
import { LookupSelectField } from "../common/LookupSelectField";
import { SuccessNote } from "../common/SuccessNote";

const schema = z.object({
  protocol_id: z.coerce.number().int().positive(),
  allocation_id: z.coerce.number().int().positive(),
  experiment_group_id: z.coerce.number().int().positive(),
  date: z.string().min(1),
  performed_by: z.string().min(1),
  purpose: z.string().min(1),
  procedure: z.string().min(1),
  dose: z.string().min(1),
  observations: z.string().min(1),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  animals: z
    .array(z.object({ animal_id: z.coerce.number().int().positive() }))
    .min(1),
});

type FormValues = z.infer<typeof schema>;

interface ExperimentFormProps {
  onCreated: (experiment: Experiment) => void;
  defaultProtocolId?: number;
}

export function ExperimentForm({ onCreated, defaultProtocolId }: ExperimentFormProps) {
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      protocol_id: defaultProtocolId ?? 0,
      allocation_id: 0,
      experiment_group_id: 0,
      date: "",
      performed_by: "",
      purpose: "",
      procedure: "",
      dose: "",
      observations: "",
      start_time: "",
      end_time: "",
      animals: [{ animal_id: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "animals",
  });

  const [protocolDetails, setProtocolDetails] = useState<FormBDetails | null>(
    null
  );
  const [protocolUsage, setProtocolUsage] = useState<FormDDetails | null>(null);
  const [protocolDetailsLoading, setProtocolDetailsLoading] = useState(false);
  const [protocolDetailsError, setProtocolDetailsError] = useState<
    string | null
  >(null);
  const [groupOptions, setGroupOptions] = useState<LookupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [allocationDate, setAllocationDate] = useState<string | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  const selectedProtocolId = watch("protocol_id");
  const selectedAllocationId = watch("allocation_id");
  const watchedDate = watch("date");

  const protocolLookup = useLookupOptions(getApprovedProtocolOptions);
  const allocationLookup = useLookupOptions(getApprovedAllocationOptions);
  const loadAnimalOptions = useCallback(async () => {
    if (!selectedAllocationId || selectedAllocationId <= 0) {
      return [];
    }
    return getApprovedAnimalOptions(selectedAllocationId);
  }, [selectedAllocationId]);
  const animalLookup = useLookupOptions(loadAnimalOptions);

  const {
    isSubmitting,
    errorMessage,
    successMessage,
    start,
    fail,
    succeed,
  } = useSubmitState();

  const minExperimentDate = latestIsoDate(
    protocolDetails?.approval_date,
    allocationDate ?? undefined,
  );

  useEffect(() => {
    if (defaultProtocolId && defaultProtocolId > 0) {
      setValue("protocol_id", defaultProtocolId, { shouldValidate: true });
    }
  }, [defaultProtocolId, setValue]);

  useEffect(() => {
    async function loadGroups() {
      if (!selectedProtocolId || selectedProtocolId <= 0) {
        setGroupOptions([]);
        setGroupsError(null);
        return;
      }

      try {
        setGroupsLoading(true);
        setGroupsError(null);
        const groups = await getGroupsByProject(selectedProtocolId);
        setGroupOptions(
          groups.map((group: ExperimentGroup) => ({
            id: group.id,
            name: `${group.name} (${group.planned_animal_count} planned)`,
          })),
        );
      } catch (error) {
        setGroupsError(getApiErrorMessage(error));
        setGroupOptions([]);
      } finally {
        setGroupsLoading(false);
      }
    }

    void loadGroups();
  }, [selectedProtocolId]);

  useEffect(() => {
    async function loadProtocolDetails() {
      if (!selectedProtocolId || selectedProtocolId <= 0) {
        setProtocolDetails(null);
        setProtocolUsage(null);
        setProtocolDetailsError(null);
        return;
      }

      try {
        setProtocolDetailsLoading(true);
        setProtocolDetailsError(null);

        const details = await getFormBDetails(selectedProtocolId);
        setProtocolDetails(details);

        try {
          const usage = await getFormDDetails(selectedProtocolId);
          setProtocolUsage(usage);
        } catch {
          setProtocolUsage(null);
        }

        if (details.purpose) {
          setValue("purpose", details.purpose, { shouldValidate: true });
        }

        if (details.principal_investigator) {
          setValue("performed_by", details.principal_investigator, {
            shouldValidate: true,
          });
        }
      } catch (error) {
        setProtocolDetailsError(getApiErrorMessage(error));
        setProtocolDetails(null);
        setProtocolUsage(null);
      } finally {
        setProtocolDetailsLoading(false);
      }
    }

    void loadProtocolDetails();
  }, [selectedProtocolId, setValue]);

  useEffect(() => {
    async function loadAllocationDate() {
      if (!selectedAllocationId || selectedAllocationId <= 0) {
        setAllocationDate(null);
        return;
      }

      try {
        const allocation = await getAllocation(selectedAllocationId);
        setAllocationDate(allocation.date);
      } catch {
        setAllocationDate(null);
      }
    }

    void loadAllocationDate();
  }, [selectedAllocationId]);

  useEffect(() => {
    if (!watchedDate || !minExperimentDate) {
      setDateValidationError(null);
      return;
    }
    setDateValidationError(
      validateDateOnOrAfter(
        watchedDate,
        minExperimentDate,
        "Experiment date",
        "IAEC approval/meeting and animal issue dates",
      ),
    );
  }, [watchedDate, minExperimentDate]);

  const onSubmit = handleSubmit(async (values) => {
    start();

    const dateError = validateDateOnOrAfter(
      values.date,
      minExperimentDate,
      "Experiment date",
      "IAEC approval/meeting and animal issue dates",
    );
    if (dateError) {
      fail(dateError);
      return;
    }

    try {
      const payload = {
        ...values,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
      };

      const created = await createExperiment(payload);
      onCreated(created);

      succeed(`Experiment created with id ${created.id}`);

      reset({
        protocol_id: defaultProtocolId ?? 0,
        allocation_id: 0,
        experiment_group_id: 0,
        date: "",
        performed_by: "",
        purpose: "",
        procedure: "",
        dose: "",
        observations: "",
        start_time: "",
        end_time: "",
        animals: [{ animal_id: 0 }],
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
        onChange={(value) =>
          setValue("protocol_id", value, { shouldValidate: true })
        }
        options={protocolLookup.options}
        loading={protocolLookup.isLoading}
        error={protocolLookup.error}
        placeholder="Select protocol"
        loadingLabel="Loading protocols..."
        fieldError={errors.protocol_id?.message}
      />

      <LookupSelectField
        label="Experiment Group"
        value={watch("experiment_group_id")}
        onChange={(value) =>
          setValue("experiment_group_id", value, { shouldValidate: true })
        }
        options={groupOptions}
        loading={groupsLoading}
        error={groupsError}
        placeholder="Select experiment group"
        loadingLabel="Loading groups..."
        fieldError={errors.experiment_group_id?.message}
      />

      <LookupSelectField
        label="Allocation"
        value={watch("allocation_id")}
        onChange={(value) =>
          setValue("allocation_id", value, { shouldValidate: true })
        }
        options={allocationLookup.options}
        loading={allocationLookup.isLoading}
        error={allocationLookup.error}
        placeholder="Select allocation"
        loadingLabel="Loading allocations..."
        fieldError={errors.allocation_id?.message}
      />

      <label>
        Date
        <input type="date" min={minExperimentDate} {...register("date")} />
        {minExperimentDate ? (
          <small>Must be on or after {formatDisplayDate(minExperimentDate)}.</small>
        ) : null}
        {dateValidationError ? <small className="field-error">{dateValidationError}</small> : null}
      </label>

      <label>
        Performed By
        <input {...register("performed_by")} />
      </label>

      <label>
        Purpose
        <input {...register("purpose")} />
      </label>

      <label>
        Procedure
        <input {...register("procedure")} />
      </label>

      <label>
        Dose
        <input {...register("dose")} />
      </label>

      <label className="full-width">
        Observations
        <textarea rows={2} {...register("observations")} />
      </label>

      <label>
        Start Time (ISO)
        <input placeholder="2026-07-14T09:00:00Z" {...register("start_time")} />
      </label>

      <label>
        End Time (ISO)
        <input placeholder="2026-07-14T11:00:00Z" {...register("end_time")} />
      </label>

      {protocolDetailsLoading ? (
        <small className="full-width">Loading protocol details...</small>
      ) : null}

      {protocolDetailsError ? (
        <small className="field-error full-width">
          {protocolDetailsError}
        </small>
      ) : null}

      {protocolDetails ? (
        <div className="full-width info-card">
          <strong>Auto-Populated from LMCPAFM Form B</strong>
          <p>Title: {protocolDetails.title ?? "-"}</p>
          <p>Protocol Number: {protocolDetails.protocol_number ?? "-"}</p>
          <p>Approval Date: {formatDisplayDate(protocolDetails.approval_date, "-")}</p>
          <p>
            Principal Investigator:{" "}
            {protocolDetails.principal_investigator ?? "-"}
          </p>

          {protocolUsage ? (
            <p>
              Allocated: {protocolUsage.allocated_count} | Remaining:{" "}
              {protocolUsage.remaining_count}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="full-width subform-header">
        <h3>Animals</h3>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => append({ animal_id: 0 })}
        >
          Add Animal
        </button>
      </div>

      {fields.map((field, index) => (
        <div className="item-row full-width" key={field.id}>
          <label>
            Animal
            <select
              value={watch(`animals.${index}.animal_id`) || ""}
              onChange={(event) =>
                setValue(
                  `animals.${index}.animal_id`,
                  Number(event.target.value),
                  { shouldValidate: true }
                )
              }
              disabled={animalLookup.isLoading || Boolean(animalLookup.error)}
            >
              <option value="">
                {animalLookup.isLoading
                  ? "Loading animals..."
                  : "Select animal"}
              </option>

              {animalLookup.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>

            {animalLookup.error ? (
              <small className="field-error">{animalLookup.error}</small>
            ) : null}

            {errors.animals?.[index]?.animal_id ? (
              <small className="field-error">
                {errors.animals[index]?.animal_id?.message}
              </small>
            ) : null}
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

      {errors.animals ? (
        <small className="field-error full-width">
          At least one valid animal ID is required.
        </small>
      ) : null}

      <button className="btn" type="submit" disabled={isSubmitting}>
        Create Experiment
      </button>

      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {successMessage ? <SuccessNote message={successMessage} /> : null}
    </form>
  );
}
