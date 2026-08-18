import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "react-router-dom";
import { z } from "zod";
import { login } from "../api/authApi";
import { getApiErrorMessage } from "../api/errors";
import { useSubmitState } from "../hooks/useSubmitState";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { SuccessNote } from "../components/common/SuccessNote";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

interface LoginPageProps {
  onAuthenticated: (accessToken: string, returnTo?: string | null) => Promise<void>;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const location = useLocation();

  const expired = new URLSearchParams(location.search).get("expired") === "1";
  const registered = new URLSearchParams(location.search).get("registered") === "1";
  const returnTo = new URLSearchParams(location.search).get("returnTo");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
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
      const token = await login(values);

      await onAuthenticated(token.access_token, returnTo);

      succeed("Authenticated successfully.");

      // ⭐ No redirect here — App.tsx handles role-based redirect
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <section className="page-card auth-card">
      <header className="section-header">
        <h2>Sign In</h2>
        <p>Use a backend user account to unlock authenticated workflow routes.</p>
      </header>

      {/* ⭐ Show session expired message */}
      {expired && (
        <ErrorAlert message="Your session has expired. Please log in again. Any work you saved to the server or restored from this browser is still available." />
      )}

      {registered && (
        <SuccessNote message="Registration successful. Please sign in with your institutional email." />
      )}

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Email
          <input type="email" {...register("email")} />
          {errors.email ? (
            <small className="field-error">{errors.email.message}</small>
          ) : null}
        </label>

        <label>
          Password
          <input type="password" {...register("password")} />
          {errors.password ? (
            <small className="field-error">{errors.password.message}</small>
          ) : null}
        </label>

        <button className="btn" type="submit" disabled={isSubmitting}>
          Log In
        </button>

        {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
        {successMessage ? <SuccessNote message={successMessage} /> : null}
      </form>

      <p className="auth-footer">
        LMCP faculty?{" "}
        <Link to="/register-investigator">Register as Investigator</Link>
      </p>
    </section>
  );
}
