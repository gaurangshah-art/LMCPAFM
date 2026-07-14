import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { createRequisition } from "../../api/requisitionApi";
import { getProtocolOptions, getSpeciesOptions, getStrainOptions } from "../../api/lookupApi";
import { getFormBDetails, type FormBDetails } from "../../api/formbApi";
import { getApiErrorMessage } from "../../api/errors";
import type { AnimalRequisition } from "../../api/types";
import { useLookupOptions } from "../../hooks/useLookupOptions";
import { useSubmitState } from "../../hooks/useSubmitState";
import { ErrorAlert } from "../common/ErrorAlert";
import { LookupSelectField } from "../common/LookupSelectField";
import { SuccessNote } from "../common/SuccessNote";

const itemSchema = z.object({
  species_id: z.coerce.number().int().positive(),
  strain_id: z.coerce.number().int().positive(),
  requested_count: z.coerce.number().int().positive(),
});

const schema = z.object({
  protocol_id: z.coerce.number().int().positive(),
  requester_name: z.string().min(1),
  requester_role: z.string().min(1),
  date: z.string().min(1),
  purpose: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

type FormValues = z.infer<typeof schema>;

interface RequisitionFormProps {
  onCreated: (value: AnimalRequisition) => void;
}

export function RequisitionForm({ onCreated }: RequisitionFormProps) {
  const { register, control, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      protocol_id: 0,
      requester_name: "",
      requester_role: "",
      date: "",
      purpose: "",
      items: [{ species_id: 0, strain_id: 0, requested_count: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const [protocolDetails, setProtocolDetails] = useState<FormBDetails | null>(null);
  const [protocolDetailsLoading, setProtocolDetailsLoading] = useState(false);
  const [protocolDetailsError, setProtocolDetailsError] = useState<string | null>(null);
  const protocolLookup = useLookupOptions(getProtocolOptions);
  const speciesLookup = useLookupOptions(getSpeciesOptions);
  const strainLookup = useLookupOptions(getStrainOptions);
  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

  const selectedProtocolId = watch("protocol_id");

  useEffect(() => {
    async function loadProtocolDetails() {
      if (!selectedProtocolId || selectedProtocolId <= 0) {
        setProtocolDetails(null);
        setProtocolDetailsError(null);
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

  const onSubmit = handleSubmit(async (values) => {
    start();
    try {
      const created = await createRequisition(values);
      onCreated(created);
      succeed(`Requisition created with id ${created.id}`);
      reset({
        protocol_id: 0,
        requester_name: "",
        requester_role: "",
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
        Requester Name
        <input {...register("requester_name")} />
      </label>
      <label>
        Requester Role
        <input {...register("requester_role")} />
      </label>
      <label>
        Date
        <input type="date" {...register("date")} />
      </label>
      <label className="full-width">
        Purpose
        <textarea {...register("purpose")} rows={2} />
      </label>

      {protocolDetailsLoading ? <small className="full-width">Loading protocol details...</small> : null}
      {protocolDetailsError ? <small className="field-error full-width">{protocolDetailsError}</small> : null}
      {protocolDetails ? (
        <div className="full-width info-card">
          <strong>Protocol Auto Details (Zoho Form B)</strong>
          <p>Title: {protocolDetails.title ?? "-"}</p>
          <p>Protocol Number: {protocolDetails.protocol_number ?? "-"}</p>
          <p>Approval Date: {protocolDetails.approval_date ?? "-"}</p>
          <p>Principal Investigator: {protocolDetails.principal_investigator ?? "-"}</p>
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
              disabled={strainLookup.isLoading || Boolean(strainLookup.error)}
            >
              <option value="">
                {strainLookup.isLoading ? "Loading strains..." : "Select strain"}
              </option>
              {strainLookup.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {strainLookup.error ? <small className="field-error">{strainLookup.error}</small> : null}
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

      <button className="btn" type="submit" disabled={isSubmitting}>
        Create Requisition
      </button>

      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {successMessage ? <SuccessNote message={successMessage} /> : null}
    </form>
  );
}
