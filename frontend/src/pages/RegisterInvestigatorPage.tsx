import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { registerInvestigator } from "../api/authApi";
import { getApiErrorMessage } from "../api/errors";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { useSubmitState } from "../hooks/useSubmitState";
import {
  institutionalEmailHint,
  isLmcpInstitutionalEmail,
} from "../utils/institutionalEmail";

const schema = z
  .object({
    name: z.string().trim().min(1, "Full name is required."),
    email: z
      .string()
      .trim()
      .email("Enter a valid institutional email address.")
      .refine(
        (value) => isLmcpInstitutionalEmail(value),
        `Registration is limited to LMCP institutional email addresses (${institutionalEmailHint()}).`,
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterInvestigatorPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { isSubmitting, errorMessage, start, fail } = useSubmitState();

  const onSubmit = handleSubmit(async (values) => {
    start();
    try {
      await registerInvestigator({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      navigate("/login?registered=1", { replace: true });
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <section className="page-card auth-card">
      <header className="section-header">
        <h2>Register as Investigator</h2>
        <p>
          Self-registration is available only for LMCP faculty with an institutional
          email address ({institutionalEmailHint()}).
        </p>
      </header>

      <p className="auth-note" role="note">
        Staff, IAEC office-bearers, caretakers, and admin accounts are created by
        the system administrator and cannot be registered here.
      </p>

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Full name
          <input type="text" autoComplete="name" {...register("name")} />
          {errors.name ? (
            <small className="field-error">{errors.name.message}</small>
          ) : null}
        </label>

        <label>
          Institutional email
          <input type="email" autoComplete="email" {...register("email")} />
          {errors.email ? (
            <small className="field-error">{errors.email.message}</small>
          ) : null}
        </label>

        <label>
          Password
          <input type="password" autoComplete="new-password" {...register("password")} />
          {errors.password ? (
            <small className="field-error">{errors.password.message}</small>
          ) : null}
        </label>

        <label>
          Confirm password
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
          {isSubmitting ? "Creating account..." : "Create Investigator Account"}
        </button>

        {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}
