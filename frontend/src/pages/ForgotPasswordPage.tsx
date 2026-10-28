import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { requestPasswordReset } from "../api/authApi";
import { getApiErrorMessage } from "../api/errors";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { SuccessNote } from "../components/common/SuccessNote";
import { useSubmitState } from "../hooks/useSubmitState";

const schema = z.object({
  email: z.string().trim().email("Enter the email address for your account."),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();

  const onSubmit = handleSubmit(async (values) => {
    start();
    try {
      const response = await requestPasswordReset(values.email.trim());
      succeed(response.message);
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <section className="page-card auth-card">
      <header className="section-header">
        <h2>Forgot password</h2>
        <p>
          Enter your account email. If we find a matching active account, we will email a link to
          set a new password.
        </p>
      </header>

      <form className="form-grid" onSubmit={(event) => void onSubmit(event)}>
        <label>
          Email
          <input type="email" autoComplete="email" {...register("email")} />
          {errors.email ? <small className="field-error">{errors.email.message}</small> : null}
        </label>

        <button className="btn" type="submit" disabled={isSubmitting || Boolean(successMessage)}>
          {isSubmitting ? "Sending..." : "Send reset link"}
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
