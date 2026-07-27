import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getFormBReview,
  getFormBStep1Autofill,
  readStoredFormBId,
  saveFormBStep1,
  startFormB,
  storeFormBId,
  type FormBStep1Autofill,
} from "../../api/formbApi";
import { getApiErrorMessage } from "../../api/errors";
import { ErrorAlert } from "../../components/common/ErrorAlert";
import { LoadingState } from "../../components/common/LoadingState";
import { InstitutionalFieldsPanel } from "../../components/forms/InstitutionalFieldsPanel";
import { RESEARCH_TYPES } from "../../constants/institution";

export function FormBStep1() {
  const navigate = useNavigate();

  const [formBId, setFormBId] = useState<number | null>(readStoredFormBId());
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
          }
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getApiErrorMessage(error));
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
  }, [formBId]);

  async function handleStartFormB() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const autofill = await getFormBStep1Autofill();
      applyAutofill(autofill);
      if (!autofill.profile_complete) {
        setErrorMessage("Complete your investigator profile before starting Form B.");
        return;
      }

      const started = await startFormB();
      setFormBId(started.id);
      storeFormBId(started.id);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
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
    return null;
  }

  async function handleNext() {
    if (!formBId) {
      setErrorMessage("Form B has not been started yet.");
      return;
    }

    const error = validateStep1();
    if (error) {
      setErrorMessage(error);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
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

      navigate("/form-b/step-2");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (prefillLoading) {
    return <LoadingState label="Loading investigator details for Form B..." />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 1</h2>
        <p>Section I: Establishment details and principal investigator information.</p>
      </header>

      {!profileComplete ? (
        <p className="auth-note" role="note">
          Your investigator profile is incomplete.{" "}
          <Link to="/investigator-profile?complete=1">Complete your profile</Link> before
          starting Form B.
        </p>
      ) : null}

      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}

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
              <input
                value={principalInvestigator}
                onChange={(e) => setPrincipalInvestigator(e.target.value)}
              />
            </label>

            <label>
              Designation
              <input value={designation} onChange={(e) => setDesignation(e.target.value)} />
            </label>

            <label>
              Department / Division / Lab
              <input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </label>

            <label>
              Contact email
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </label>

            <label>
              Contact phone
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </label>

            <label>
              Qualifications
              <input
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
              />
            </label>

            <label className="full-width">
              Experience in laboratory animal experimentation
              <textarea value={experience} onChange={(e) => setExperience(e.target.value)} />
            </label>
          </div>

          <div className="wizard-actions">
            <button type="button" className="btn" onClick={handleNext} disabled={loading}>
              {loading ? "Saving..." : "Save and continue"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
