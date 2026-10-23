import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createMasterSpecies,
  createMasterStrain,
  deleteMasterSpecies,
  deleteMasterStrain,
  getMasterSpecies,
  getMasterStrains,
  updateMasterSpecies,
  updateMasterStrain,
  type SpeciesRecord,
  type StrainRecord,
} from "../api/adminMasterApi";
import { getApiErrorMessage } from "../api/errors";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageHeader } from "../components/common/PageHeader";
import { PageSection } from "../components/common/PageSection";
import { DataTable } from "../components/tables/DataTable";

export function AdminMasterDataPage() {
  const [species, setSpecies] = useState<SpeciesRecord[]>([]);
  const [strains, setStrains] = useState<StrainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speciesName, setSpeciesName] = useState("");
  const [strainSpeciesId, setStrainSpeciesId] = useState("");
  const [strainName, setStrainName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [speciesRows, strainRows] = await Promise.all([getMasterSpecies(), getMasterStrains()]);
      setSpecies(speciesRows);
      setStrains(strainRows);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const speciesOptions = useMemo(
    () => species.map((row) => ({ id: row.id, name: row.name })),
    [species],
  );

  async function handleAddSpecies() {
    if (!speciesName.trim()) return;
    setSaving(true);
    try {
      const created = await createMasterSpecies(speciesName.trim());
      setSpecies((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSpeciesName("");
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddStrain() {
    if (!strainSpeciesId || !strainName.trim()) return;
    setSaving(true);
    try {
      const created = await createMasterStrain(Number(strainSpeciesId), strainName.trim());
      setStrains((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setStrainName("");
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading master data..." />;
  }

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Superadmin"
        title="Master data"
        subtitle="Maintain species and strain lists used in Form B, requisitions, and facility records."
      />

      {error ? <ErrorAlert message={error} /> : null}

      <PageSection title="Species" subtitle="Add or rename species available across the application">
        <div className="form-grid">
          <label className="full-width">
            New species name
            <input value={speciesName} onChange={(e) => setSpeciesName(e.target.value)} />
          </label>
          <button type="button" className="btn" disabled={saving} onClick={() => void handleAddSpecies()}>
            Add species
          </button>
        </div>
        <DataTable
          rows={species}
          emptyText="No species defined."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Name", cell: (row) => row.name },
            {
              header: "Actions",
              cell: (row) => (
                <div className="table-action-group">
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() => {
                      const next = window.prompt("Rename species", row.name);
                      if (!next?.trim()) return;
                      void updateMasterSpecies(row.id, next.trim())
                        .then((updated) => {
                          setSpecies((current) =>
                            current.map((item) => (item.id === row.id ? updated : item)),
                          );
                        })
                        .catch((err) => alert(getApiErrorMessage(err)));
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn-danger btn-small"
                    onClick={() => {
                      if (!window.confirm(`Delete species "${row.name}"?`)) return;
                      void deleteMasterSpecies(row.id)
                        .then(() => {
                          setSpecies((current) => current.filter((item) => item.id !== row.id));
                          setStrains((current) => current.filter((item) => item.species_id !== row.id));
                        })
                        .catch((err) => alert(getApiErrorMessage(err)));
                    }}
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
      </PageSection>

      <PageSection title="Strains" subtitle="Strains are linked to a species">
        <div className="form-grid">
          <label>
            Species
            <select value={strainSpeciesId} onChange={(e) => setStrainSpeciesId(e.target.value)}>
              <option value="">Select species</option>
              {speciesOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </label>
          <label>
            Strain name
            <input value={strainName} onChange={(e) => setStrainName(e.target.value)} />
          </label>
          <button type="button" className="btn" disabled={saving} onClick={() => void handleAddStrain()}>
            Add strain
          </button>
        </div>
        <DataTable
          rows={strains}
          emptyText="No strains defined."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Species", cell: (row) => row.species_name ?? row.species_id },
            { header: "Strain", cell: (row) => row.name },
            {
              header: "Actions",
              cell: (row) => (
                <div className="table-action-group">
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() => {
                      const next = window.prompt("Rename strain", row.name);
                      if (!next?.trim()) return;
                      void updateMasterStrain(row.id, next.trim())
                        .then((updated) => {
                          setStrains((current) =>
                            current.map((item) => (item.id === row.id ? updated : item)),
                          );
                        })
                        .catch((err) => alert(getApiErrorMessage(err)));
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn-danger btn-small"
                    onClick={() => {
                      if (!window.confirm(`Delete strain "${row.name}"?`)) return;
                      void deleteMasterStrain(row.id)
                        .then(() => {
                          setStrains((current) => current.filter((item) => item.id !== row.id));
                        })
                        .catch((err) => alert(getApiErrorMessage(err)));
                    }}
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
      </PageSection>
    </div>
  );
}
