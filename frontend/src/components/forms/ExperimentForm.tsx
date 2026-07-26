import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { createExperiment } from "../../api/experimentApi";
import {
  getApprovedAllocationOptions,
  getApprovedAnimalOptions,
  getApprovedProtocolOptions,
} from "../../api/lookupApi";

import { getFormBDetails, type FormBDetails } from "../../api/formbApi";
import { getFormDDetails, type FormDDetails } from "../../api/formdApi";
import { getApiErrorMessage } from "../../api/errors";

import type { Experiment } from "../../api/types";

import { useLookupOptions } from "../../hooks/useLookupOptions";
import { useSubmitState } from "../../hooks/useSubmitState";
import { formatDisplayDate } from "../../utils/dateFormat";

import { ErrorAlert } from "../common/ErrorAlert";
import { LookupSelectField } from "../common/LookupSelectField";
import { SuccessNote } from "../common/SuccessNote";

const schema = z.object({
  protocol_id: z.coerce.number().int().positive(),
  allocation_id: z.coerce.number().int().positive(),
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
}

export function ExperimentForm({ onCreated }: ExperimentFormProps) {
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
      protocol_id: 0,
      allocation_id: 0,
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

  const protocolLookup = useLookupOptions(getApprovedProtocolOptions);
  const allocationLookup = useLookupOptions(getApprovedAllocationOptions);
  const animalLookup = useLookupOptions(getApprovedAnimalOptions);

  const {
    isSubmitting,
    errorMessage,
    successMessage,
    start,
    fail,
    succeed,
  } = useSubmitState();

  const selectedProtocolId = watch("protocol_id");

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

  const onSubmit = handleSubmit(async (values) => {
    start();

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
        protocol_id: 0,
        allocation_id: 0,
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
        <input type="date" {...register("date")} />
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
