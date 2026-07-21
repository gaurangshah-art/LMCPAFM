import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function FormBStep3() {
  const navigate = useNavigate();

  const [formBId] = useState<number | null>(
    Number(localStorage.getItem("form_b_id")) || null
  );

  const [loading, setLoading] = useState(false);

  const [species, setSpecies] = useState("");
  const [strain, setStrain] = useState("");
  const [sex, setSex] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [numberRequired, setNumberRequired] = useState("");
  const [source, setSource] = useState("");
  const [justification, setJustification] = useState("");

  function validateStep3() {
    if (!species) return "Species is required.";
    if (!strain) return "Strain is required.";
    if (!sex) return "Sex is required.";
    if (!age) return "Age is required.";
    if (!weight.trim()) return "Weight range is required.";
    if (!numberRequired || Number(numberRequired) <= 0)
      return "Number of animals must be greater than zero.";
    if (!source) return "Source of animals is required.";
    if (!justification.trim()) return "Justification is required.";
    return null;
  }

  async function handleNext() {
    if (!formBId) {
      alert("Form B ID missing. Please complete previous steps.");
      return;
    }

    const error = validateStep3();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    try {
      await api.post("/form-b/step-3", {
        form_b_id: formBId,
        species,
        strain,
        sex,
        age,
        weight,
        number_required: Number(numberRequired),
        source,
        justification,
      });

      navigate("/form-b/step-4");
    } catch {
      alert("Failed to save Step 3.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 3</h2>
        <p>Animal Requirements</p>
      </header>

      {!formBId && (
        <p className="error-text">
          Form B ID not found. Please complete Step 1 and Step 2 first.
        </p>
      )}

      {formBId && (
        <>
          <p><strong>Form B internal ID:</strong> {formBId}</p>

          <div className="form-grid">

            <label>
              Species
              <select value={species} onChange={(e) => setSpecies(e.target.value)}>
                <option value="">Select species</option>
                <option value="Rat">Rat</option>
                <option value="Mouse">Mouse</option>
                <option value="Rabbit">Rabbit</option>
                <option value="Guinea Pig">Guinea Pig</option>
                <option value="Hamster">Hamster</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Strain
              <select value={strain} onChange={(e) => setStrain(e.target.value)}>
                <option value="">Select strain</option>
                <option value="Wistar">Wistar</option>
                <option value="Sprague Dawley">Sprague Dawley</option>
                <option value="Swiss Albino">Swiss Albino</option>
                <option value="BALB/c">BALB/c</option>
                <option value="C57BL/6">C57BL/6</option>
                <option value="New Zealand White">New Zealand White</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Sex
              <select value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="">Select sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Either">Either</option>
              </select>
            </label>

            <label>
              Age
              <select value={age} onChange={(e) => setAge(e.target.value)}>
                <option value="">Select age</option>
                <option value="4–6 weeks">4–6 weeks</option>
                <option value="6–8 weeks">6–8 weeks</option>
                <option value="8–10 weeks">8–10 weeks</option>
                <option value="Adult">Adult</option>
              </select>
            </label>

            <label>
              Weight Range (grams)
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g., 150–200 g"
              />
            </label>

            <label>
              Number of Animals Required
              <input
                type="number"
                value={numberRequired}
                onChange={(e) => setNumberRequired(e.target.value)}
              />
            </label>

            <label>
              Source of Animals
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="">Select source</option>
                <option value="Institutional Animal House">Institutional Animal House</option>
                <option value="CPCSEA Registered Breeder">CPCSEA Registered Breeder</option>
                <option value="Other IAEC-approved source">Other IAEC-approved source</option>
              </select>
            </label>

            <label>
              Justification for Number of Animals
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
            </label>

          </div>

          <div className="wizard-actions">
            <button className="btn-secondary" onClick={() => navigate("/form-b/step-2")}>
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
