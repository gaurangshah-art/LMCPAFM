import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { createExperiment } from "../../api/experimentApi";
import { getApiErrorMessage } from "../../api/errors";
import type { Experiment } from "../../api/types";
import { useSubmitState } from "../../hooks/useSubmitState";
import { ErrorAlert } from "../common/ErrorAlert";
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
  animals: z.array(z.object({ animal_id: z.coerce.number().int().positive() })).min(1),
});

type FormValues = z.infer<typeof schema>;

interface ExperimentFormProps {
  onCreated: (experiment: Experiment) => void;
}

export function ExperimentForm({ onCreated }: ExperimentFormProps) {
  const { register, control, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
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

  const { fields, append, remove } = useFieldArray({ control, name: "animals" });
  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

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
      <label>
        Protocol ID
        <input type="number" {...register("protocol_id")} />
      </label>
      <label>
        Allocation ID
        <input type="number" {...register("allocation_id")} />
      </label>
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
            Animal ID
            <input type="number" {...register(`animals.${index}.animal_id`)} />
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

      {errors.animals ? <small className="field-error full-width">At least one valid animal ID is required.</small> : null}

      <button className="btn" type="submit" disabled={isSubmitting}>
        Create Experiment
      </button>
      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {successMessage ? <SuccessNote message={successMessage} /> : null}
    </form>
  );
}
