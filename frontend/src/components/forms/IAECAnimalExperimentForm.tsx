import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createIAECExperiment } from "../../api/iaecApi";
import { getApprovedExperimentGroupOptions } from "../../api/lookupApi";
import { getApiErrorMessage } from "../../api/errors";
import type { AnimalExperiment, AnimalExperimentCreate } from "../../api/types";
import { useLookupOptions } from "../../hooks/useLookupOptions";
import { useSubmitState } from "../../hooks/useSubmitState";
import { ErrorAlert } from "../common/ErrorAlert";
import { LookupSelectField } from "../common/LookupSelectField";
import { SuccessNote } from "../common/SuccessNote";

const schema = z.object({
  description: z.string().min(1),
  group_id: z.coerce.number().int().positive(),
});

type FormValues = z.infer<typeof schema>;

interface IAECAnimalExperimentFormProps {
  onCreated?: (experiment: AnimalExperiment) => void;
  onSubmit?: (values: AnimalExperimentCreate) => void;
  initialValues?: AnimalExperiment;
  submitLabel?: string;
}

export function IAECAnimalExperimentForm({
  onCreated,
  onSubmit: onSubmitProp,
  initialValues,
  submitLabel = "Create IAEC Experiment",
}: IAECAnimalExperimentFormProps) {
  const { register, watch, setValue, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
      ? { description: initialValues.description, group_id: initialValues.group_id }
      : { description: "", group_id: 0 },
  });

  const groupLookup = useLookupOptions(getApprovedExperimentGroupOptions);
  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

  const onSubmit = handleSubmit(async (values) => {
    start();
    try {
      if (onSubmitProp) {
        onSubmitProp(values);
        succeed("IAEC experiment updated.");
        return;
      }

      const created = await createIAECExperiment(values);
      onCreated?.(created);
      succeed(`IAEC experiment created with id ${created.id}`);
      reset({ description: "", group_id: 0 });
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label className="full-width">
        Description
        <textarea rows={2} {...register("description")} />
      </label>
      <LookupSelectField
        label="Experiment Group"
        value={watch("group_id")}
        onChange={(value) => setValue("group_id", value, { shouldValidate: true })}
        options={groupLookup.options}
        loading={groupLookup.isLoading}
        error={groupLookup.error}
        placeholder="Select experiment group"
        loadingLabel="Loading experiment groups..."
        fieldError={errors.group_id?.message}
      />
      <button className="btn" type="submit" disabled={isSubmitting}>
        {submitLabel}
      </button>
      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {successMessage ? <SuccessNote message={successMessage} /> : null}
    </form>
  );
}
