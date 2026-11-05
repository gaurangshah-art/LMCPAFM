import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { resetPasswordWithToken } from "../api/authApi";
import { getApiErrorMessage } from "../api/errors";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { SuccessNote } from "../components/common/SuccessNote";
import { useSubmitState } from "../hooks/useSubmitState";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

  const onSubmit = handleSubmit(async (values) => {
    if (!token) {
      fail("Reset link is missing or invalid. Request a new link from the sign-in page.");
      return;
    }

    start();
    try {
      await resetPasswordWithToken({
        token,
        new_password: values.newPassword,
      });
      succeed("Password updated. You can sign in with your new password.");
      window.setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  if (!token) {
    return (
      <section className="page-card auth-card">
        <ErrorAlert message="This reset link is missing or invalid." />
        <p className="auth-footer">
          <Link to="/forgot-password">Request a new reset link</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="page-card auth-card">
      <header className="section-header">
        <h2>Set a new password</h2>
        <p>Choose a new password for your LMCPAFM account.</p>
      </header>

      <form className="form-grid" onSubmit={(event) => void onSubmit(event)}>
        <label>
          New password
          <input type="password" autoComplete="new-password" {...register("newPassword")} />
          {errors.newPassword ? (
            <small className="field-error">{errors.newPassword.message}</small>
          ) : null}
        </label>

        <label>
          Confirm new password
          <input type="password" autoComplete="new-password" {...register("confirmPassword")} />
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

      <p className="auth-footer">
        <Link to="/login">Back to sign in</Link>
      </p>
    </section>
  );
}
