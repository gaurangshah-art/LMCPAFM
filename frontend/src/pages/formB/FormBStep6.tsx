import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../api/errors";
import {
  readStoredFormBId,
  saveFormBStep6,
  type FormBAuthorizedPersonnelEntry,
} from "../../api/formbApi";
import { LoadingState } from "../../components/common/LoadingState";
import { readString, useFormBStepReview } from "../../hooks/useFormBStepReview";

interface PersonnelRow extends FormBAuthorizedPersonnelEntry {
  id: string;
}

const EMPTY_PERSON: PersonnelRow = {
  id: "",
  name: "",
  designation: "",
  department: "",
  telephone: "",
  email: "",
  experience: "",
};

function createEmptyPerson(): PersonnelRow {
  return { ...EMPTY_PERSON, id: crypto.randomUUID() };
}

function mapSaved(data: Record<string, unknown> | null | undefined) {
  const personnelRaw = data?.authorized_personnel;
  const authorizedPersonnel =
    Array.isArray(personnelRaw) && personnelRaw.length > 0
      ? personnelRaw.map((entry) => {
          const row = entry as Record<string, unknown>;
          return {
            id: crypto.randomUUID(),
            name: String(row.name ?? ""),
            designation: String(row.designation ?? ""),
            department: String(row.department ?? ""),
            telephone: String(row.telephone ?? ""),
            email: String(row.email ?? ""),
            experience: String(row.experience ?? ""),
          };
        })
      : [createEmptyPerson()];

  return {
    authorizedPersonnel,
    trainingLevel: readString(data, "training_level"),
    trainingDetails: readString(data, "training_details"),
    competencyCertification: readString(data, "competency_certification"),
  };
}

export function FormBStep6() {
  const navigate = useNavigate();
  const [formBId] = useState<number | null>(readStoredFormBId());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authorizedPersonnel, setAuthorizedPersonnel] = useState<PersonnelRow[]>([
    createEmptyPerson(),
  ]);
  const [trainingLevel, setTrainingLevel] = useState("");
  const [trainingDetails, setTrainingDetails] = useState("");
  const [competencyCertification, setCompetencyCertification] = useState("");

  const { value: saved, loading: loadingSaved } = useFormBStepReview(
    formBId,
    "step6",
    mapSaved,
    mapSaved(null),
  );

  useEffect(() => {
    if (!saved) return;
    setAuthorizedPersonnel(saved.authorizedPersonnel);
    setTrainingLevel(saved.trainingLevel);
    setTrainingDetails(saved.trainingDetails);
    setCompetencyCertification(saved.competencyCertification);
  }, [saved]);

  function updatePerson(id: string, patch: Partial<PersonnelRow>) {
    setAuthorizedPersonnel((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function validateStep6() {
    for (let index = 0; index < authorizedPersonnel.length; index += 1) {
      const person = authorizedPersonnel[index];
      const label = `Personnel ${index + 1}`;
      if (!person.name.trim()) return `${label}: name is required.`;
      if (!person.designation.trim()) return `${label}: designation is required.`;
      if (!person.department.trim()) return `${label}: department is required.`;
      if (!person.telephone.trim()) return `${label}: telephone is required.`;
      if (!person.email.trim()) return `${label}: email is required.`;
      if (!person.experience.trim()) return `${label}: experience is required.`;
    }
    if (!trainingLevel) return "Training level is required.";
    if (!trainingDetails.trim()) return "Training details are required.";
    if (!competencyCertification) return "Competency certification is required.";
    return null;
  }

  async function handleNext() {
    if (!formBId) {
      alert("Form B ID missing. Please complete previous steps.");
      return;
    }

    const error = validateStep6();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await saveFormBStep6({
        form_b_id: formBId,
        authorized_personnel: authorizedPersonnel.map(({ id: _id, ...person }) => ({
          ...person,
          name: person.name.trim(),
          designation: person.designation.trim(),
          department: person.department.trim(),
          telephone: person.telephone.trim(),
          email: person.email.trim(),
          experience: person.experience.trim(),
        })),
        training_level: trainingLevel,
        training_details: trainingDetails.trim(),
        competency_certification: competencyCertification,
      });

      navigate("/form-b/step-7");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (loadingSaved) {
    return <LoadingState label="Loading personnel and training..." />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 6</h2>
        <p>Section II: Authorized personnel and training.</p>
      </header>

      {!formBId && (
        <p className="error-text">Form B ID not found. Please complete previous steps.</p>
      )}

      {formBId && (
        <>
          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
          <p><strong>Form B internal ID:</strong> {formBId}</p>

          <div className="subform-header full-width">
            <h3>Authorized personnel</h3>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAuthorizedPersonnel((current) => [...current, createEmptyPerson()])}
            >
              Add personnel
            </button>
          </div>

          {authorizedPersonnel.map((person, index) => (
            <div key={person.id} className="item-row full-width">
              <div className="subform-header full-width">
                <h3>Person {index + 1}</h3>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() =>
                    setAuthorizedPersonnel((current) =>
                      current.length === 1
                        ? current
                        : current.filter((row) => row.id !== person.id),
                    )
                  }
                  disabled={authorizedPersonnel.length === 1}
                >
                  Remove
                </button>
              </div>
              <div className="form-grid">
                <label>
                  Name
                  <input
                    value={person.name}
                    onChange={(e) => updatePerson(person.id, { name: e.target.value })}
                  />
                </label>
                <label>
                  Designation
                  <input
                    value={person.designation}
                    onChange={(e) => updatePerson(person.id, { designation: e.target.value })}
                  />
                </label>
                <label>
                  Department
                  <input
                    value={person.department}
                    onChange={(e) => updatePerson(person.id, { department: e.target.value })}
                  />
                </label>
                <label>
                  Telephone
                  <input
                    value={person.telephone}
                    onChange={(e) => updatePerson(person.id, { telephone: e.target.value })}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={person.email}
                    onChange={(e) => updatePerson(person.id, { email: e.target.value })}
                  />
                </label>
                <label className="full-width">
                  Experience in laboratory animal experimentation
                  <textarea
                    value={person.experience}
                    onChange={(e) => updatePerson(person.id, { experience: e.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}

          <div className="form-grid">
            <label>
              Overall training level
              <select value={trainingLevel} onChange={(e) => setTrainingLevel(e.target.value)}>
                <option value="">Select training level</option>
                <option value="Basic animal handling">Basic animal handling</option>
                <option value="Advanced animal handling">Advanced animal handling</option>
                <option value="Surgical training">Surgical training</option>
                <option value="CPCSEA training">CPCSEA training</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Competency certification
              <select
                value={competencyCertification}
                onChange={(e) => setCompetencyCertification(e.target.value)}
              >
                <option value="">Select certification</option>
                <option value="Certified by IAEC">Certified by IAEC</option>
                <option value="Certified by CPCSEA">Certified by CPCSEA</option>
                <option value="Certified by Institutional Committee">Certified by Institutional Committee</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="full-width">
              Training details
              <textarea value={trainingDetails} onChange={(e) => setTrainingDetails(e.target.value)} />
            </label>
          </div>

          <div className="wizard-actions">
            <button className="btn-secondary" onClick={() => navigate("/form-b/step-5")}>
              ← Back
            </button>
            <button className="btn" onClick={handleNext} disabled={loading}>
              Save & Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
