import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createProject } from "../../api/iaecApi";
import { getApiErrorMessage } from "../../api/errors";
import type { IAECProject } from "../../api/types";
import { useSubmitState } from "../../hooks/useSubmitState";
import { ErrorAlert } from "../common/ErrorAlert";
import { LoadingState } from "../common/LoadingState";
import { SuccessNote } from "../common/SuccessNote";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  investigator_name: z.string().min(1, "Investigator name is required"),
  protocol_number: z.string().optional(),
  approval_date: z.string().optional(),
  principal_investigator: z.string().optional(),
  purpose: z.string().optional(),
  status: z.string().optional(),
  objective: z.string().optional(),
  start_date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface IAECProjectFormProps {
  onCreated: (project: IAECProject) => void;
}

export function IAECProjectForm({ onCreated }: IAECProjectFormProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      investigator_name: "",
    },
  });

  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

  const onSubmit = handleSubmit(async (values) => {
    start();
    try {
      const payload = {
        ...values,
        protocol_number: values.protocol_number || null,
        approval_date: values.approval_date || null,
        principal_investigator: values.principal_investigator || null,
        purpose: values.purpose || null,
        status: values.status || null,
        objective: values.objective || null,
        start_date: values.start_date || null,
      };

      const created = await createProject(payload);
      onCreated(created);
      reset({ title: "", investigator_name: "" });
      succeed(`Project created with id ${created.id}`);
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Title
        <input {...register("title")} />
        {errors.title ? <small className="field-error">{errors.title.message}</small> : null}
      </label>
      <label>
        Investigator Name
        <input {...register("investigator_name")} />
        {errors.investigator_name ? <small className="field-error">{errors.investigator_name.message}</small> : null}
      </label>
      <label>
        Protocol Number
        <input {...register("protocol_number")} />
      </label>
      <label>
        Approval Date
        <input type="date" {...register("approval_date")} />
      </label>
      <label>
        Principal Investigator
        <input {...register("principal_investigator")} />
      </label>
      <label>
        Purpose
        <input {...register("purpose")} />
      </label>
      <label>
        Status
        <input {...register("status")} />
      </label>
      <label>
        Objective
        <input {...register("objective")} />
      </label>
      <label>
        Start Date
        <input type="date" {...register("start_date")} />
      </label>
      <button className="btn" type="submit" disabled={isSubmitting}>
        Create Project
      </button>
      {isSubmitting ? <LoadingState label="Creating project..." /> : null}
      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {successMessage ? <SuccessNote message={successMessage} /> : null}
    </form>
  );
}
