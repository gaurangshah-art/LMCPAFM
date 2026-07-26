import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  getMyInvestigatorProfile,
  updateMyInvestigatorProfile,
} from "../api/investigatorProfileApi";
import { getApiErrorMessage } from "../api/errors";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { useSubmitState } from "../hooks/useSubmitState";
import {
  institutionalEmailHint,
  isLmcpInstitutionalEmail,
} from "../utils/institutionalEmail";

const schema = z.object({
  institutional_email: z
    .string()
    .trim()
    .email("Enter a valid institutional email address.")
    .refine(
      (value) => isLmcpInstitutionalEmail(value),
      `Use an LMCP institutional email (${institutionalEmailHint()}).`,
    ),
  institution_name: z.string().trim().min(1, "Institution name is required."),
  department: z.string().trim().min(1, "Department is required."),
  designation: z.string().trim().min(1, "Designation is required."),
  qualification: z.string().trim().min(1, "Qualification is required."),
  age: z
    .union([z.literal(""), z.coerce.number().int().min(18).max(120)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  years_experience: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(80)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  animal_handling_experience: z.string().trim().optional(),
  is_lmcp_faculty: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function InvestigatorProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mustComplete = searchParams.get("complete") === "1";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { isSubmitting, errorMessage, start, fail, succeed } = useSubmitState();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      institutional_email: "",
      institution_name: "LMCP",
      department: "",
      designation: "",
      qualification: "",
      age: null,
      years_experience: null,
      animal_handling_experience: "",
      is_lmcp_faculty: true,
    },
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const profile = await getMyInvestigatorProfile();
        if (cancelled) return;
        reset({
          institutional_email: profile.institutional_email ?? "",
          institution_name: profile.institution_name ?? "LMCP",
          department: profile.department ?? "",
          designation: profile.designation ?? "",
          qualification: profile.qualification ?? "",
          age: profile.age,
          years_experience: profile.years_experience,
          animal_handling_experience: profile.animal_handling_experience ?? "",
          is_lmcp_faculty: profile.is_lmcp_faculty,
        });
      } catch (error) {
        if (!cancelled) {
          setLoadError(getApiErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit = handleSubmit(async (values) => {
    start();
    try {
      const profile = await updateMyInvestigatorProfile({
        institutional_email: values.institutional_email.trim().toLowerCase(),
        institution_name: values.institution_name.trim(),
        department: values.department.trim(),
        designation: values.designation.trim(),
        qualification: values.qualification.trim(),
        age: values.age,
        years_experience: values.years_experience,
        animal_handling_experience: values.animal_handling_experience?.trim() || null,
        is_lmcp_faculty: values.is_lmcp_faculty,
      });
      succeed("Profile saved.");
      if (profile.is_complete) {
        navigate("/investigator-dashboard", { replace: true });
      }
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  if (loading) {
    return <LoadingState label="Loading investigator profile..." />;
  }

  if (loadError) {
    return <ErrorAlert message={loadError} />;
  }

  return (
    <section className="page-card">
      <header className="section-header">
        <h2>Investigator Profile</h2>
        <p>
          Complete your faculty profile once. This information will auto-populate Form B and
          related IAEC submissions.
        </p>
      </header>

      {mustComplete ? (
        <p className="auth-note" role="note">
          Please complete the required profile fields before continuing with project workflows.
        </p>
      ) : null}

      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Institutional email
          <input type="email" autoComplete="email" {...register("institutional_email")} />
          {errors.institutional_email ? (
            <span className="field-error">{errors.institutional_email.message}</span>
          ) : null}
        </label>

        <label>
          Institution name
          <input type="text" {...register("institution_name")} />
          {errors.institution_name ? (
            <span className="field-error">{errors.institution_name.message}</span>
          ) : null}
        </label>

        <label>
          Department
          <input type="text" {...register("department")} />
          {errors.department ? (
            <span className="field-error">{errors.department.message}</span>
          ) : null}
        </label>

        <label>
          Designation
          <input type="text" placeholder="e.g. Assistant Professor" {...register("designation")} />
          {errors.designation ? (
            <span className="field-error">{errors.designation.message}</span>
          ) : null}
        </label>

        <label>
          Qualification
          <input type="text" placeholder="e.g. MD, PhD" {...register("qualification")} />
          {errors.qualification ? (
            <span className="field-error">{errors.qualification.message}</span>
          ) : null}
        </label>

        <label>
          Age
          <input type="number" min={18} max={120} {...register("age")} />
          {errors.age ? <span className="field-error">{errors.age.message}</span> : null}
        </label>

        <label>
          Years of experience
          <input type="number" min={0} max={80} {...register("years_experience")} />
          {errors.years_experience ? (
            <span className="field-error">{errors.years_experience.message}</span>
          ) : null}
        </label>

        <label className="full-width">
          Animal handling experience
          <textarea rows={4} {...register("animal_handling_experience")} />
        </label>

        <label className="checkbox-row">
          <input type="checkbox" {...register("is_lmcp_faculty")} />
          I am LMCP faculty
        </label>

        <div className="form-actions full-width">
          <button type="submit" className="btn" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}
