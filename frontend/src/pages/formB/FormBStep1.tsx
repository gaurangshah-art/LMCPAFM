// src/pages/formB/FormBStep1.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function FormBStep1() {
  const navigate = useNavigate();

  const [formBId, setFormBId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [establishmentName, setEstablishmentName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [principalInvestigator, setPrincipalInvestigator] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [experience, setExperience] = useState("");

  async function handleStartFormB() {
    setLoading(true);
    try {
      const res = await api.post("/form-b/start");
      setFormBId(res.data.id);
    } catch {
      alert("Failed to start Form B.");
    } finally {
      setLoading(false);
    }
  }

  function validateStep1() {
    if (!establishmentName.trim()) return "Establishment name is required.";
    if (!registrationNumber.trim()) return "Registration number is required.";
    if (!principalInvestigator.trim()) return "Principal investigator is required.";
    if (!designation) return "Designation is required.";
    if (!department) return "Department is required.";
    if (!contactEmail.trim()) return "Contact email is required.";
    if (!contactPhone.trim()) return "Contact phone is required.";
    if (!qualifications) return "Qualifications are required.";
    return null;
  }

  async function handleNext() {
    if (!formBId) {
      alert("Form B not started yet.");
      return;
    }

    const error = validateStep1();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    try {
      await api.post("/form-b/step-1", {
        form_b_id: formBId,
        establishment_name: establishmentName,
        registration_number: registrationNumber,
        principal_investigator: principalInvestigator,
        designation,
        department,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        qualifications,
        experience,
      });

      navigate("/form-b/step-2");
    } catch {
      alert("Failed to save Step 1.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 1</h2>
        <p>Investigator & Establishment Details</p>
      </header>

      {!formBId && (
        <button className="btn" onClick={handleStartFormB} disabled={loading}>
          Start Form B
        </button>
      )}

      {formBId && (
        <>
          <p><strong>Form B internal ID:</strong> {formBId}</p>

          <div className="form-grid">
            <label>
              Establishment Name
              <input
                value={establishmentName}
                onChange={(e) => setEstablishmentName(e.target.value)}
              />
            </label>

            <label>
              Registration Number
              <input
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
              />
            </label>

            <label>
              Principal Investigator
              <input
                value={principalInvestigator}
                onChange={(e) => setPrincipalInvestigator(e.target.value)}
              />
            </label>

            <label>
              Designation
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              >
                <option value="">Select designation</option>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lecturer">Lecturer</option>
                <option value="Research Scholar">Research Scholar</option>
                <option value="Scientist">Scientist</option>
                <option value="Post-Doctoral Fellow">Post-Doctoral Fellow</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Department
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">Select department</option>
                <option value="Pharmacology">Pharmacology</option>
                <option value="Pharmaceutics">Pharmaceutics</option>
                <option value="Pharmaceutical Chemistry">Pharmaceutical Chemistry</option>
                <option value="Pharmacognosy">Pharmacognosy</option>
                <option value="Biotechnology">Biotechnology</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Contact Email
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </label>

            <label>
              Contact Phone
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </label>

            <label>
              Qualifications
              <select
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
              >
                <option value="">Select qualifications</option>
                <option value="B.Pharm">B.Pharm</option>
                <option value="M.Pharm">M.Pharm</option>
                <option value="Pharm.D">Pharm.D</option>
                <option value="PhD">PhD</option>
                <option value="MSc">MSc</option>
                <option value="MBBS">MBBS</option>
                <option value="MVSc">MVSc</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Experience in animal work
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
            </label>
          </div>

          <div className="wizard-actions">
            <button className="btn" onClick={handleNext} disabled={loading}>
              Save & Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
