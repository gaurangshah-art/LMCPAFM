import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createUser } from "../../api/userApi";
import { getApiErrorMessage } from "../../api/errors";
import type { User } from "../../api/types";
import {
  ASSIGNABLE_ADMIN_ROLES,
  type AssignableAdminRole,
} from "../../constants/adminRoles";
import { ErrorAlert } from "../common/ErrorAlert";
import { SuccessNote } from "../common/SuccessNote";
import { useSubmitState } from "../../hooks/useSubmitState";
import { AssignableRoleCheckboxes } from "./AssignableRoleCheckboxes";
import {
  institutionalEmailHint,
  isLmcpInstitutionalEmail,
} from "../../utils/institutionalEmail";

const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    status: z.boolean(),
    is_certified_animal_handler: z.boolean(),
    roles: z
      .array(z.enum(ASSIGNABLE_ADMIN_ROLES))
      .min(1, "Select at least one role."),
  })
  .superRefine((values, ctx) => {
    if (
      values.roles.includes("investigator") &&
      !isLmcpInstitutionalEmail(values.email)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Investigator email must use an institutional domain (${institutionalEmailHint()}).`,
        path: ["email"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface CreateStaffUserFormProps {
  onCreated: (user: User) => void;
}

export function CreateStaffUserForm({ onCreated }: CreateStaffUserFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      status: true,
      is_certified_animal_handler: false,
      roles: ["staff"],
    },
  });
  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();
  const selectedRoles = watch("roles");

  const onSubmit = handleSubmit(async (values) => {
    start();
    try {
      const created = await createUser({
        name: values.name,
        email: values.email,
        password: values.password,
        roles: [...values.roles],
        status: values.status,
        is_certified_animal_handler: values.is_certified_animal_handler,
      });
      onCreated(created);
      succeed(`Created ${created.email}.`);
      reset({
        name: "",
        email: "",
        password: "",
        status: true,
        roles: ["staff"],
        is_certified_animal_handler: false,
      });
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  function handleRolesChange(roles: AssignableAdminRole[]) {
    setValue("roles", roles, { shouldValidate: true });
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Name
        <input {...register("name")} autoComplete="name" />
        {errors.name ? <small className="field-error">{errors.name.message}</small> : null}
      </label>
      <label>
        Email
        <input type="email" {...register("email")} autoComplete="off" />
        {errors.email ? <small className="field-error">{errors.email.message}</small> : null}
      </label>
      <label>
        Temporary password
        <input type="password" {...register("password")} autoComplete="new-password" />
        {errors.password ? <small className="field-error">{errors.password.message}</small> : null}
      </label>
      <label className="toggle-field">
        <span>Active account</span>
        <input type="checkbox" {...register("status")} />
      </label>
      <div className="full-width">
        <span className="checkbox-group-label">Roles</span>
        <AssignableRoleCheckboxes
          idPrefix="create-user-role"
          selectedRoles={selectedRoles}
          onChange={handleRolesChange}
        />
        {errors.roles ? <small className="field-error">{errors.roles.message}</small> : null}
        {selectedRoles.includes("investigator") ? (
          <label className="toggle-field full-width">
            <span>Certified for animal handling (requisitions + Form B requirement)</span>
            <input type="checkbox" {...register("is_certified_animal_handler")} />
          </label>
        ) : null}
        <small>
          For faculty: select <strong>investigator</strong>, use their institutional email, and set a
          temporary password. Tick <strong>Certified for animal handling</strong> for the ~10–15 faculty
          who may submit animal requisitions and satisfy the Form B certified-faculty rule. Others may still
          draft Form B but must link a certified colleague before submit.
        </small>
      </div>
      <button className="btn" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </button>
      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      {successMessage ? <SuccessNote message={successMessage} /> : null}
    </form>
  );
}
