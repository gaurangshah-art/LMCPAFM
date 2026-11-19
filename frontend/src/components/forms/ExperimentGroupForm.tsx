import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createGroup } from "../../api/iaecApi";
import { getApprovedProtocolOptions } from "../../api/lookupApi";
import { getApiErrorMessage } from "../../api/errors";
import type { ExperimentGroup } from "../../api/types";
import { useLookupOptions } from "../../hooks/useLookupOptions";
import { useSubmitState } from "../../hooks/useSubmitState";
import { ErrorAlert } from "../common/ErrorAlert";
import { LookupSelectField } from "../common/LookupSelectField";
import { SuccessNote } from "../common/SuccessNote";

const schema = z.object({
  name: z.string().min(1, "Group name is required"),
  project_id: z.coerce.number().int().positive(),
  planned_animal_count: z.coerce.number().int().positive("Planned animal count must be at least 1"),
});

type FormValues = z.infer<typeof schema>;

interface ExperimentGroupFormProps {
  onCreated: (group: ExperimentGroup) => void;
  defaultProjectId?: number;
  projectTitle?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function ExperimentGroupForm({
  onCreated,
  defaultProjectId,
  projectTitle,
  disabled = false,
  disabledReason,
}: ExperimentGroupFormProps) {
  const projectLocked = Boolean(defaultProjectId && defaultProjectId > 0);

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      project_id: defaultProjectId && defaultProjectId > 0 ? defaultProjectId : 0,
      planned_animal_count: 1,
    },
  });

  const projectLookup = useLookupOptions(getApprovedProtocolOptions, { enabled: !projectLocked });
  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

  useEffect(() => {
    if (projectLocked) {
      setValue("project_id", defaultProjectId!, { shouldValidate: true });
    }
  }, [defaultProjectId, projectLocked, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    start();
    try {
      const created = await createGroup(values);
      onCreated(created);
      succeed(`Experiment group created with id ${created.id}`);
      reset({
        name: "",
        project_id: projectLocked ? defaultProjectId! : 0,
        planned_animal_count: 1,
      });
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      {projectLocked ? (
        <>
          <input type="hidden" {...register("project_id")} />
          {projectTitle ? (
            <p className="auth-note full-width" role="note">
              Creating a group for <strong>{projectTitle}</strong>.
            </p>
          ) : null}
        </>
      ) : null}
      <label>
        Group Name
        <input {...register("name")} disabled={disabled} />
        {errors.name ? <small className="field-error">{errors.name.message}</small> : null}
      </label>
      <label>
        Planned Animal Count
        <input
          type="number"
          min={1}
          step={1}
          disabled={disabled}
          onWheel={(event) => event.currentTarget.blur()}
          {...register("planned_animal_count")}
        />
        {errors.planned_animal_count ? (
          <small className="field-error">{errors.planned_animal_count.message}</small>
        ) : null}
      </label>
      {!projectLocked ? (
        <LookupSelectField
          label="Project"
          value={watch("project_id")}
          onChange={(value) => setValue("project_id", value, { shouldValidate: true })}
          options={projectLookup.options}
          loading={projectLookup.isLoading}
          error={projectLookup.error}
          placeholder="Select project"
          loadingLabel="Loading projects..."
          fieldError={errors.project_id?.message}
        />
      ) : null}
      <button className="btn" type="submit" disabled={isSubmitting || disabled}>
        Create Group
      </button>
      {disabled && disabledReason ? (
        <p className="auth-note full-width" role="note">
          {disabledReason}
        </p>
      ) : null}
      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {successMessage ? <SuccessNote message={successMessage} /> : null}
    </form>
  );
}
