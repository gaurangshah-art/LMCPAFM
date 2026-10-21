import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { amendRequisition } from "../../api/requisitionApi";
import { getApprovedSpeciesOptions, getApprovedStrainsOptions, type LookupOption } from "../../api/lookupApi";
import { getApiErrorMessage } from "../../api/errors";
import type { AnimalRequisition } from "../../api/types";
import { useLookupOptions } from "../../hooks/useLookupOptions";
import { useSubmitState } from "../../hooks/useSubmitState";
import { ErrorAlert } from "../common/ErrorAlert";
import { SuccessNote } from "../common/SuccessNote";

const itemSchema = z.object({
  species_id: z.coerce.number().int().positive(),
  strain_id: z.coerce.number().int().positive(),
  requested_count: z.coerce.number().int().positive(),
});

const schema = z.object({
  date: z.string().min(1),
  purpose: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

type FormValues = z.infer<typeof schema>;

interface RequisitionAmendFormProps {
  requisition: AnimalRequisition;
  onSaved: (value: AnimalRequisition) => void;
  onCancel: () => void;
}

export function RequisitionAmendForm({
  requisition,
  onSaved,
  onCancel,
}: RequisitionAmendFormProps) {
  const speciesLookup = useLookupOptions(getApprovedSpeciesOptions);
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: requisition.date,
      purpose: requisition.purpose,
      items: requisition.items.map((item) => ({
        species_id: item.species_id,
        strain_id: item.strain_id,
        requested_count: item.requested_count,
      })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const [strainOptionsByIndex, setStrainOptionsByIndex] = useState<Record<number, LookupOption[]>>({});
  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

  useEffect(() => {
    fields.forEach((_, index) => {
      const speciesId = watchedItems?.[index]?.species_id;
      if (!speciesId || speciesId <= 0) {
        setStrainOptionsByIndex((prev) => ({ ...prev, [index]: [] }));
        return;
      }
      void (async () => {
        const options = await getApprovedStrainsOptions(speciesId);
        setStrainOptionsByIndex((prev) => ({ ...prev, [index]: options }));
      })();
    });
  }, [fields, watchedItems]);

  const onSubmit = handleSubmit(async (values) => {
    start();
    try {
      const updated = await amendRequisition(requisition.id, {
        date: values.date,
        purpose: values.purpose,
        items: values.items,
      });
      succeed("Requisition updated.");
      onSaved(updated);
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Date
        <input type="date" {...register("date")} />
      </label>
      <label className="full-width">
        Purpose
        <textarea {...register("purpose")} rows={2} />
      </label>

      <div className="full-width subform-header">
        <h3>Items</h3>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => append({ species_id: 0, strain_id: 0, requested_count: 1 })}
        >
          Add item
        </button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="item-row full-width">
          <label>
            Species
            <select
              value={watch(`items.${index}.species_id`) || ""}
              onChange={(e) =>
                setValue(`items.${index}.species_id`, Number(e.target.value), { shouldValidate: true })
              }
            >
              <option value="">Select species</option>
              {speciesLookup.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Strain
            <select
              value={watch(`items.${index}.strain_id`) || ""}
              onChange={(e) =>
                setValue(`items.${index}.strain_id`, Number(e.target.value), { shouldValidate: true })
              }
            >
              <option value="">Select strain</option>
              {(strainOptionsByIndex[index] ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Count
            <input type="number" min={1} {...register(`items.${index}.requested_count`)} />
          </label>
          {fields.length > 1 ? (
            <button type="button" className="btn btn-secondary" onClick={() => remove(index)}>
              Remove
            </button>
          ) : null}
          {errors.items?.[index] ? (
            <small className="field-error full-width">Check species, strain, and count.</small>
          ) : null}
        </div>
      ))}

      <div className="wizard-actions full-width">
        <button type="submit" className="btn" disabled={isSubmitting}>
          Save changes
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Close
        </button>
      </div>

      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {successMessage ? <SuccessNote message={successMessage} /> : null}
    </form>
  );
}
