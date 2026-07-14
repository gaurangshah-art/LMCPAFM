import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createGroup } from "../../api/iaecApi";
import { getApiErrorMessage } from "../../api/errors";
import type { ExperimentGroup } from "../../api/types";
import { useSubmitState } from "../../hooks/useSubmitState";
import { ErrorAlert } from "../common/ErrorAlert";
import { SuccessNote } from "../common/SuccessNote";

const schema = z.object({
  name: z.string().min(1, "Group name is required"),
  project_id: z.coerce.number().int().positive(),
});

type FormValues = z.infer<typeof schema>;

interface ExperimentGroupFormProps {
  onCreated: (group: ExperimentGroup) => void;
}

export function ExperimentGroupForm({ onCreated }: ExperimentGroupFormProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", project_id: 0 },
  });

  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

  const onSubmit = handleSubmit(async (values) => {
    start();
    try {
      const created = await createGroup(values);
      onCreated(created);
      succeed(`Experiment group created with id ${created.id}`);
      reset({ name: "", project_id: 0 });
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Group Name
        <input {...register("name")} />
        {errors.name ? <small className="field-error">{errors.name.message}</small> : null}
      </label>
      <label>
        Project ID
        <input type="number" {...register("project_id")} />
      </label>
      <button className="btn" type="submit" disabled={isSubmitting}>
        Create Group
      </button>
      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {successMessage ? <SuccessNote message={successMessage} /> : null}
    </form>
  );
}
