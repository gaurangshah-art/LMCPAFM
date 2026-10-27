import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { changePassword } from "../api/authApi";
import { getApiErrorMessage } from "../api/errors";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { PageSection } from "../components/common/PageSection";
import { SuccessNote } from "../components/common/SuccessNote";
import { useSubmitState } from "../hooks/useSubmitState";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: "New password must differ from your current password.",
    path: ["newPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

  const onSubmit = handleSubmit(async (values) => {
    start();
    try {
      await changePassword({
        current_password: values.currentPassword,
        new_password: values.newPassword,
      });
      reset();
      succeed("Password updated. Use your new password the next time you log in.");
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <div className="page-grid">
      <PageSection
        title="Change password"
        subtitle="Update the password for your LMCPAFM account."
      >
        <form className="form-grid" onSubmit={(event) => void onSubmit(event)}>
          <label className="full-width">
            Current password
            <input
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            {errors.currentPassword ? (
              <small className="field-error">{errors.currentPassword.message}</small>
            ) : null}
          </label>

          <label className="full-width">
            New password
            <input
              type="password"
              autoComplete="new-password"
              {...register("newPassword")}
            />
            {errors.newPassword ? (
              <small className="field-error">{errors.newPassword.message}</small>
            ) : null}
          </label>

          <label className="full-width">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <small className="field-error">{errors.confirmPassword.message}</small>
            ) : null}
          </label>

          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update password"}
          </button>

          {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
          {successMessage ? <SuccessNote message={successMessage} /> : null}
        </form>
      </PageSection>
    </div>
  );
}
