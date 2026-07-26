import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createProject, updateProject } from "../../api/iaecApi";
import { getApiErrorMessage } from "../../api/errors";

import type { IAECProject, IAECProjectCreate } from "../../api/types";

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
  initialValues?: IAECProject; // NEW: for editing
  onCreated: (project: IAECProject) => void; // used for both create + update
  submitLabel?: string; // NEW: "Create Project" or "Update Project"
}

export function IAECProjectForm({
  initialValues,
  onCreated,
  submitLabel = "Create Project",
}: IAECProjectFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
      ? {
          title: initialValues.title,
          investigator_name: initialValues.investigator_name ?? initialValues.investigator ?? "",
          protocol_number: initialValues.protocol_number ?? "",
          approval_date: initialValues.approval_date ?? "",
          principal_investigator: initialValues.principal_investigator ?? "",
          purpose: initialValues.purpose ?? "",
          status: initialValues.status ?? "",
          objective: initialValues.objective ?? "",
          start_date: initialValues.start_date ?? "",
        }
      : {
          title: "",
          investigator_name: "",
        },
  });

  const {
    isSubmitting,
    errorMessage,
    successMessage,
    start,
    fail,
    succeed,
  } = useSubmitState();

  const onSubmit = handleSubmit(async (values) => {
    start();

    try {
      const payload: IAECProjectCreate = {
        ...values,
        protocol_number: values.protocol_number || null,
        approval_date: values.approval_date || null,
        principal_investigator: values.principal_investigator || null,
        purpose: values.purpose || null,
        status: values.status || null,
        objective: values.objective || null,
        start_date: values.start_date || null,
      };

      let result: IAECProject;

      if (initialValues) {
        // ⭐ EDIT MODE
        result = await updateProject(initialValues.id, payload);
        succeed(`Project #${result.id} updated successfully.`);
      } else {
        // ⭐ CREATE MODE
        result = await createProject(payload);
        succeed(`Project created with id ${result.id}`);
        reset({ title: "", investigator_name: "" });
      }

      onCreated(result);
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Title
        <input {...register("title")} />
        {errors.title && (
          <small className="field-error">{errors.title.message}</small>
        )}
      </label>

      <label>
        Investigator Name
        <input {...register("investigator_name")} />
        {errors.investigator_name && (
          <small className="field-error">
            {errors.investigator_name.message}
          </small>
        )}
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
        {submitLabel}
      </button>

      {isSubmitting && <LoadingState label="Submitting..." />}
      {errorMessage && <ErrorAlert message={errorMessage} />}
      {successMessage && <SuccessNote message={successMessage} />}
    </form>
  );
}
