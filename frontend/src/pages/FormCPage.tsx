import { useCallback, useEffect, useState } from "react";
import { getFormCData } from "../api/inventoryApi";
import { downloadFormCPdf } from "../api/facilityApi";
import { getApiErrorMessage } from "../api/errors";
import type { FormCData } from "../api/types";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageHeader } from "../components/common/PageHeader";
import { PageSection } from "../components/common/PageSection";
import { formatDisplayDate } from "../utils/dateFormat";

function cell(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return "—";
  }
  return value;
}

export function FormCPage() {
  const [formC, setFormC] = useState<FormCData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadFormC = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getFormCData();
      setFormC(data);
    } catch (loadError) {
      setFormC(null);
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFormC();
  }, [loadFormC]);

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Animal facility register"
        title="Form C — Breeding and Stock Register"
        subtitle={`Read-only register compiled from current inventory, procurement, and allocation records.${
          formC ? ` Snapshot as of ${formatDisplayDate(formC.as_of_date)}.` : ""
        }`}
        actions={
          <>
            <button type="button" className="btn" onClick={() => void loadFormC()} disabled={isLoading}>
              Refresh register
            </button>
            <button type="button" className="btn-secondary" onClick={() => void downloadFormCPdf()} disabled={isLoading}>
              Download PDF
            </button>
          </>
        }
      />

      {isLoading ? <LoadingState label="Loading Form C register..." /> : null}
      {error ? <ErrorAlert message={error} /> : null}

      {!isLoading && !error && formC ? (
        <>
          <PageSection title="Stock on hand" subtitle="Available animals by species and strain">
            {formC.stock_rows.length === 0 ? (
              <p className="empty-text">No stock rows recorded.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Species</th>
                      <th>Strain</th>
                      <th>In stock</th>
                      <th>Sex</th>
                      <th>Age</th>
                      <th>Voucher / bill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formC.stock_rows.map((row) => (
                      <tr key={`${row.species_id}-${row.strain_id}`}>
                        <td>{formatDisplayDate(row.date)}</td>
                        <td>{row.species_name}</td>
                        <td>{row.strain_name}</td>
                        <td>{row.number_in_stock}</td>
                        <td>{cell(row.sex)}</td>
                        <td>{cell(row.age)}</td>
                        <td>{cell(row.voucher_or_bill_number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PageSection>

          <PageSection title="Acquisitions" subtitle="Procurement and inward movement">
            {formC.acquisition_rows.length === 0 ? (
              <p className="empty-text">No acquisition rows recorded.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Acquired</th>
                      <th>Species</th>
                      <th>Strain</th>
                      <th>Supplier</th>
                      <th>Source</th>
                      <th>Voucher / bill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formC.acquisition_rows.map((row) => (
                      <tr key={row.procurement_id}>
                        <td>{formatDisplayDate(row.date)}</td>
                        <td>{row.number_acquired}</td>
                        <td>{row.species_name}</td>
                        <td>{row.strain_name}</td>
                        <td>{cell(row.supplier_name)}</td>
                        <td>{cell(row.acquired_from ?? row.supplier_address)}</td>
                        <td>{cell(row.voucher_or_bill_number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PageSection>

          <PageSection title="Breeding births" subtitle="In-house breeding records">
            {(formC.breeding_rows ?? []).length === 0 ? (
              <p className="empty-text">No breeding rows recorded.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Species</th>
                      <th>Strain</th>
                      <th>Offspring</th>
                      <th>Litters</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formC.breeding_rows ?? []).map((row) => (
                      <tr key={row.breeding_record_id}>
                        <td>{formatDisplayDate(row.date)}</td>
                        <td>{row.species_name}</td>
                        <td>{row.strain_name}</td>
                        <td>{row.number_born}</td>
                        <td>{row.litter_count}</td>
                        <td>{cell(row.remarks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PageSection>

          <PageSection title="Disposals / deaths" subtitle="Sacrifice, euthanasia, and natural deaths">
            {(formC.disposal_rows ?? []).length === 0 ? (
              <p className="empty-text">No disposal rows recorded.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Animal</th>
                      <th>Species</th>
                      <th>Strain</th>
                      <th>Method</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formC.disposal_rows ?? []).map((row) => (
                      <tr key={row.disposal_id}>
                        <td>{formatDisplayDate(row.date)}</td>
                        <td>{cell(row.animal_number ?? row.animal_id)}</td>
                        <td>{row.species_name}</td>
                        <td>{row.strain_name}</td>
                        <td>{row.method}</td>
                        <td>{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PageSection>

          <PageSection title="Supplied / issued" subtitle="Animals allocated to investigators or destinations">
            {formC.supplied_rows.length === 0 ? (
              <p className="empty-text">No supplied rows recorded.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Supplied</th>
                      <th>Species</th>
                      <th>Strain</th>
                      <th>Destination</th>
                      <th>Registration no.</th>
                      <th>Allocation ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formC.supplied_rows.map((row) => (
                      <tr key={`${row.allocation_id}-${row.species_id}-${row.strain_id}-${row.date}`}>
                        <td>{formatDisplayDate(row.date)}</td>
                        <td>{row.number_supplied}</td>
                        <td>{row.species_name}</td>
                        <td>{row.strain_name}</td>
                        <td>{cell(row.destination_name ?? row.destination_address)}</td>
                        <td>{cell(row.destination_registration_number)}</td>
                        <td>{row.allocation_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PageSection>
        </>
      ) : null}
    </div>
  );
}
