import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getFormBReview,
  getFormBStep1Autofill,
  saveFormBStep1,
  startFormB,
  type FormBStep1Autofill,
} from "../../api/formbApi";
import {
  getApiErrorMessage,
  isFormBAccessDeniedError,
  isFormBNotFoundError,
  isRecoverableStoredFormBError,
} from "../../api/errors";
import { LoadingState } from "../../components/common/LoadingState";
import { SuccessNote } from "../../components/common/SuccessNote";
import { InstitutionalFieldsPanel } from "../../components/forms/InstitutionalFieldsPanel";
import { RESEARCH_TYPES } from "../../constants/institution";
import { DraftRestoreBanner } from "../../components/common/DraftRestoreBanner";
import { FormRequiredLegend } from "../../components/common/FormRequiredLegend";
import { RequiredMark } from "../../components/common/RequiredMark";
import { WizardActionBar } from "../../components/common/WizardActionBar";
import { useFormDraftPersistence } from "../../hooks/useFormDraftPersistence";
import { useFormBEditRouteGuard } from "../../hooks/useFormBEditRouteGuard";
import { useResolvedFormBId } from "../../hooks/useResolvedFormBId";
import { useWizardValidation } from "../../hooks/useWizardValidation";

export function FormBStep1() {
  const navigate = useNavigate();

  const { formBId, setFormBId, validating, staleNotice, submitted } = useResolvedFormBId();
  useFormBEditRouteGuard(formBId, submitted, validating);
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(true);
  const [institutional, setInstitutional] = useState<FormBStep1Autofill | null>(null);

  const [principalInvestigator, setPrincipalInvestigator] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [experience, setExperience] = useState("");
  const [researchType, setResearchType] = useState("");
  const [contactEmailSaved, setContactEmailSaved] = useState<boolean | null>(null);
  const { validationRef, validationError, showValidationError, clearValidationError } =
    useWizardValidation();

  const step1Draft = useMemo(
    () => ({
      principalInvestigator,
      designation,
      department,
      contactEmail,
      contactPhone,
      qualifications,
      experience,
      researchType,
    }),
    [
      principalInvestigator,
      designation,
      department,
      contactEmail,
      contactPhone,
      qualifications,
      experience,
      researchType,
    ],
  );

  const { restoreOffer, acceptRestore, dismissRestore, clearDraft } = useFormDraftPersistence({
    formBId,
    stepKey: "step1",
    draft: step1Draft,
    hydrated: !prefillLoading && !validating,
    applyDraft: (saved) => {
      setPrincipalInvestigator(saved.principalInvestigator);
      setDesignation(saved.designation);
      setDepartment(saved.department);
      setContactEmail(saved.contactEmail);
      setContactPhone(saved.contactPhone);
      setQualifications(saved.qualifications);
      setExperience(saved.experience);
      setResearchType(saved.researchType);
    },
  });

  function applyAutofill(autofill: FormBStep1Autofill) {
    setInstitutional(autofill);
    setPrincipalInvestigator(autofill.principal_investigator ?? "");
    setDesignation(autofill.designation ?? "");
    setDepartment(autofill.department ?? "");
    setContactEmail(autofill.contact_email ?? "");
    setContactPhone(autofill.contact_phone ?? "");
    setQualifications(autofill.qualifications ?? "");
    setExperience(autofill.experience ?? "");
    setProfileComplete(autofill.profile_complete);
  }

  useEffect(() => {
    if (validating) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const autofill = await getFormBStep1Autofill();
        if (cancelled) return;
        applyAutofill(autofill);

        if (formBId) {
          const review = await getFormBReview(formBId);
          const step1 = review.step1;
          if (!cancelled && step1) {
            setResearchType(String(step1.research_type ?? ""));
            setPrincipalInvestigator(String(step1.principal_investigator ?? autofill.principal_investigator ?? ""));
            setDesignation(String(step1.designation ?? autofill.designation ?? ""));
            setDepartment(String(step1.department ?? autofill.department ?? ""));
            setContactEmail(String(step1.contact_email ?? autofill.contact_email ?? ""));
            setContactPhone(String(step1.contact_phone ?? ""));
            setQualifications(String(step1.qualifications ?? autofill.qualifications ?? ""));
            setExperience(String(step1.experience ?? autofill.experience ?? ""));
            setContactEmailSaved(Boolean(String(step1.contact_email ?? "").trim()));
          } else {
            setContactEmailSaved(false);
          }
        }
      } catch (error) {
        if (!cancelled && !isRecoverableStoredFormBError(error)) {
          showValidationError(getApiErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setPrefillLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formBId, validating]);

  async function handleStartFormB() {
    setLoading(true);
    clearValidationError();
    try {
      const autofill = await getFormBStep1Autofill();
      applyAutofill(autofill);
      if (!autofill.profile_complete) {
        showValidationError("Complete your investigator profile before starting Form B.");
        return;
      }

      const started = await startFormB();
      setFormBId(started.id);
    } catch (error) {
      showValidationError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function validateStep1() {
    if (!researchType) return "Type of research is required.";
    if (!principalInvestigator.trim()) return "Principal investigator is required.";
    if (!designation.trim()) return "Designation is required.";
    if (!department.trim()) return "Department is required.";
    if (!contactEmail.trim()) return "Contact email is required.";
    if (!contactPhone.trim()) return "Contact phone is required.";
    if (!qualifications.trim()) return "Qualifications are required.";
    if (!experience.trim()) return "Experience in laboratory animal experimentation is required.";
    return null;
  }

  async function handleNext() {
    if (!formBId) {
      showValidationError("Form B has not been started yet.");
      return;
    }

    const error = validateStep1();
    if (error) {
      showValidationError(error);
      return;
    }

    clearValidationError();
    setLoading(true);
    try {
      await saveFormBStep1({
        form_b_id: formBId,
        principal_investigator: principalInvestigator.trim(),
        designation: designation.trim(),
        department: department.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        qualifications: qualifications.trim(),
        experience: experience.trim(),
        research_type: researchType,
      });
      setContactEmailSaved(true);
      clearDraft();

      navigate("/form-b/step-2");
    } catch (error) {
      if (isFormBAccessDeniedError(error) || isFormBNotFoundError(error)) {
        setFormBId(null);
        navigate("/form-b/step-1?new=1", { replace: true });
        showValidationError(
          "This Form B could not be saved. Click Start Form B to begin a new application.",
        );
      } else {
        showValidationError(getApiErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  }

  if (prefillLoading || validating) {
    return <LoadingState label="Loading investigator details for Form B..." />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 1</h2>
        <p>Section I: Establishment details and principal investigator information.</p>
      </header>

      {restoreOffer ? (
        <DraftRestoreBanner onRestore={acceptRestore} onDismiss={dismissRestore} />
      ) : null}

      <FormRequiredLegend />

      {!profileComplete ? (
        <p className="auth-note" role="note">
          Your investigator profile is incomplete.{" "}
          <Link to="/investigator-profile?complete=1">Complete your profile</Link> before
          starting Form B.
        </p>
      ) : null}

      {staleNotice ? <SuccessNote message={staleNotice} /> : null}

      {formBId && contactEmailSaved === false && contactEmail.trim() ? (
        <p className="auth-note" role="note">
          Contact email is prefilled from your profile but not saved on this Form B yet. Click{" "}
          <strong>Save and continue</strong> so IAEC meeting invitations can use it.
        </p>
      ) : null}

      {!formBId ? (
        <button type="button" className="btn" onClick={handleStartFormB} disabled={loading}>
          {loading ? "Starting..." : "Start Form B"}
        </button>
      ) : null}

      {formBId ? (
        <>
          <p>
            <strong>Form B ID:</strong> {formBId}
          </p>

          <InstitutionalFieldsPanel
            establishmentName={institutional?.establishment_name ?? undefined}
            establishmentAddress={institutional?.establishment_address ?? undefined}
            registrationNumber={institutional?.registration_number ?? undefined}
            registrationDate={institutional?.registration_date ?? undefined}
            animalHousingLocation={institutional?.animal_housing_location ?? undefined}
            experimentLocation={institutional?.experiment_location ?? undefined}
          />

          <div className="form-grid">
            <label>
              Type of research
              <RequiredMark />
              <select value={researchType} onChange={(e) => setResearchType(e.target.value)}>
                <option value="">Select research type</option>
                {RESEARCH_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Principal investigator
              <RequiredMark />
              <input
                value={principalInvestigator}
                onChange={(e) => setPrincipalInvestigator(e.target.value)}
              />
            </label>

            <label>
              Designation
              <RequiredMark />
              <input value={designation} onChange={(e) => setDesignation(e.target.value)} />
            </label>

            <label>
              Department / Division / Lab
              <RequiredMark />
              <input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </label>

            <label>
              Contact email
              <RequiredMark />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </label>

            <label>
              Contact phone
              <RequiredMark />
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </label>

            <label>
              Qualifications
              <RequiredMark />
              <input
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
              />
            </label>

            <label className="full-width">
              Experience in laboratory animal experimentation
              <RequiredMark />
              <textarea value={experience} onChange={(e) => setExperience(e.target.value)} />
            </label>
          </div>

          <WizardActionBar validationError={validationError} actionRef={validationRef}>
            <button type="button" className="btn" onClick={handleNext} disabled={loading}>
              {loading ? "Saving..." : "Save and continue"}
            </button>
          </WizardActionBar>
        </>
      ) : null}
    </div>
  );
}
