import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { createRequisition } from "../../api/requisitionApi";
import { getApiErrorMessage } from "../../api/errors";
import type { AnimalRequisition } from "../../api/types";
import { useSubmitState } from "../../hooks/useSubmitState";
import { ErrorAlert } from "../common/ErrorAlert";
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
  const { register, control, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
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
  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

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
      <label>
        Protocol ID
        <input type="number" {...register("protocol_id")} />
      </label>
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
            Species ID
            <input type="number" {...register(`items.${index}.species_id`)} />
          </label>
          <label>
            Strain ID
            <input type="number" {...register(`items.${index}.strain_id`)} />
          </label>
          <label>
            Requested Count
            <input type="number" {...register(`items.${index}.requested_count`)} />
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
