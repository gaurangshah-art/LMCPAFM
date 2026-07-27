import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { createAllocation, getRequisition } from "../../api/requisitionApi";
import { getFormBDetails } from "../../api/formbApi";
import {
  getApprovedRequisitionItemOptions,
  getApprovedRequisitionOptions,
  type LookupOption,
} from "../../api/lookupApi";
import { getApiErrorMessage } from "../../api/errors";
import type { AnimalAllocation } from "../../api/types";
import { useLookupOptions } from "../../hooks/useLookupOptions";
import { useSubmitState } from "../../hooks/useSubmitState";
import { ErrorAlert } from "../common/ErrorAlert";
import { LookupSelectField } from "../common/LookupSelectField";
import { SuccessNote } from "../common/SuccessNote";
import { formatDisplayDate } from "../../utils/dateFormat";
import { latestIsoDate, validateDateOnOrAfter } from "../../utils/businessValidation";

const itemSchema = z.object({
  requisition_item_id: z.coerce.number().int().positive(),
  allocated_count: z.coerce.number().int().nonnegative(),
  remaining_count: z.coerce.number().int().nonnegative(),
});

const schema = z.object({
  requisition_id: z.coerce.number().int().positive(),
  date: z.string().min(1),
  allocated_by: z.string().min(1),
  remarks: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

type FormValues = z.infer<typeof schema>;

interface AllocationFormProps {
  onCreated: (allocation: AnimalAllocation) => void;
}

export function AllocationForm({ onCreated }: AllocationFormProps) {
  const { register, control, watch, setValue, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      requisition_id: 0,
      date: "",
      allocated_by: "",
      remarks: "",
      items: [{ requisition_item_id: 0, allocated_count: 0, remaining_count: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const [itemOptions, setItemOptions] = useState<LookupOption[]>([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [requisitionDate, setRequisitionDate] = useState<string | null>(null);
  const [approvalDate, setApprovalDate] = useState<string | null>(null);
  const requisitionLookup = useLookupOptions(getApprovedRequisitionOptions);
  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

  const selectedRequisitionId = watch("requisition_id");
  const watchedDate = watch("date");
  const minAllocationDate = latestIsoDate(approvalDate ?? undefined, requisitionDate ?? undefined);
  const dateValidationError =
    watchedDate && minAllocationDate
      ? validateDateOnOrAfter(
          watchedDate,
          minAllocationDate,
          "Animal issue date",
          "IAEC approval and requisition dates",
        )
      : null;

  useEffect(() => {
    async function loadRequisitionContext() {
      if (!selectedRequisitionId || selectedRequisitionId <= 0) {
        setRequisitionDate(null);
        setApprovalDate(null);
        return;
      }

      try {
        const requisition = await getRequisition(selectedRequisitionId);
        setRequisitionDate(requisition.date);
        const protocol = await getFormBDetails(requisition.protocol_id);
        setApprovalDate(protocol.approval_date);
      } catch {
        setRequisitionDate(null);
        setApprovalDate(null);
      }
    }

    void loadRequisitionContext();
  }, [selectedRequisitionId]);

  useEffect(() => {
    async function loadRequisitionItems() {
      if (!selectedRequisitionId || selectedRequisitionId <= 0) {
        setItemOptions([]);
        setItemError(null);
        return;
      }

      try {
        setItemLoading(true);
        setItemError(null);
        const options = await getApprovedRequisitionItemOptions(selectedRequisitionId);
        setItemOptions(options);
      } catch (error) {
        setItemError(getApiErrorMessage(error));
        setItemOptions([]);
      } finally {
        setItemLoading(false);
      }
    }

    void loadRequisitionItems();
  }, [selectedRequisitionId]);

  const onSubmit = handleSubmit(async (values) => {
    start();
    const dateError = validateDateOnOrAfter(
      values.date,
      minAllocationDate,
      "Animal issue date",
      "IAEC approval and requisition dates",
    );
    if (dateError) {
      fail(dateError);
      return;
    }
    try {
      const created = await createAllocation(values);
      onCreated(created);
      succeed(`Allocation created with id ${created.id}`);
      reset({
        requisition_id: 0,
        date: "",
        allocated_by: "",
        remarks: "",
        items: [{ requisition_item_id: 0, allocated_count: 0, remaining_count: 0 }],
      });
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <LookupSelectField
        label="Requisition"
        value={watch("requisition_id")}
        onChange={(value) => setValue("requisition_id", value, { shouldValidate: true })}
        options={requisitionLookup.options}
        loading={requisitionLookup.isLoading}
        error={requisitionLookup.error}
        placeholder="Select requisition"
        loadingLabel="Loading requisitions..."
        fieldError={errors.requisition_id?.message}
      />
      <label>
        Date
        <input type="date" min={minAllocationDate} {...register("date")} />
        {minAllocationDate ? (
          <small>Must be on or after {formatDisplayDate(minAllocationDate)}.</small>
        ) : null}
        {dateValidationError ? <small className="field-error">{dateValidationError}</small> : null}
      </label>
      <label>
        Allocated By
        <input {...register("allocated_by")} />
      </label>
      <label className="full-width">
        Remarks
        <textarea rows={2} {...register("remarks")} />
      </label>

      <div className="full-width subform-header">
        <h3>Allocation Items</h3>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => append({ requisition_item_id: 0, allocated_count: 0, remaining_count: 0 })}
        >
          Add Item
        </button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="item-row full-width">
          <label>
            Requisition Item
            <select
              value={watch(`items.${index}.requisition_item_id`) || ""}
              onChange={(event) => {
                setValue(`items.${index}.requisition_item_id`, Number(event.target.value), { shouldValidate: true });
              }}
              disabled={itemLoading || Boolean(itemError)}
            >
              <option value="">
                {itemLoading ? "Loading requisition items..." : "Select requisition item"}
              </option>
              {itemOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {itemError ? <small className="field-error">{itemError}</small> : null}
            {errors.items?.[index]?.requisition_item_id ? (
              <small className="field-error">{errors.items[index]?.requisition_item_id?.message}</small>
            ) : null}
          </label>
          <label>
            Allocated Count
            <input
              type="number"
              min={0}
              step={1}
              onWheel={(event) => event.currentTarget.blur()}
              {...register(`items.${index}.allocated_count`)}
            />
          </label>
          <label>
            Remaining Count
            <input
              type="number"
              min={0}
              step={1}
              onWheel={(event) => event.currentTarget.blur()}
              {...register(`items.${index}.remaining_count`)}
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

      {errors.items ? <small className="field-error full-width">Please add valid allocation items.</small> : null}
      <button className="btn" type="submit" disabled={isSubmitting}>
        Create Allocation
      </button>
      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {successMessage ? <SuccessNote message={successMessage} /> : null}
    </form>
  );
}
