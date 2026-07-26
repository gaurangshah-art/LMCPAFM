import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { formatDisplayDate } from "../../utils/dateFormat";
import { getApiErrorMessage } from "../../api/errors";

interface CertificateData {
  lmcp_iaec_id: string;
  title: string;
  investigator: string;
  department: string;
  meeting_year?: number | null;
  meeting_number?: string | null;
  meeting_date?: string | null;
  approval_date?: string | null;
  comments: string;
  chairperson_name: string;
  decision?: string | null;
}

export function IaecApprovalCertificate() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    (async () => {
      try {
        const { data } = await apiClient.get<CertificateData>(
          `/iaec/project/${projectId}/certificate`,
        );
        if (!cancelled) {
          setCertificate(data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getApiErrorMessage(error));
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
  }, [projectId]);

  async function downloadCertificate() {
    if (!projectId) return;

    try {
      const response = await apiClient.get(`/iaec/project/${projectId}/certificate/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `IAEC_Approval_${certificate?.lmcp_iaec_id || projectId}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  if (loading) {
    return (
      <div className="page-card">
        <p>Loading certificate...</p>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="page-card">
        <p className="error-text">{errorMessage ?? "Failed to load certificate."}</p>
      </div>
    );
  }

  return (
    <div className="page-card certificate-preview">
      <header className="section-header">
        <h2>IAEC Approval Certificate</h2>
        <p>Official approval document for the project.</p>
      </header>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      <div className="certificate-box">
        <h3 className="certificate-title">L. M. College of Pharmacy</h3>
        <p className="certificate-subtitle">Institutional Animal Ethics Committee (IAEC)</p>
        <hr />

        <p><strong>LMCP/IAEC ID:</strong> {certificate.lmcp_iaec_id || "Pending"}</p>
        <p><strong>Project Title:</strong> {certificate.title}</p>
        <p><strong>Principal Investigator:</strong> {certificate.investigator}</p>
        <p><strong>Department:</strong> {certificate.department || "-"}</p>

        <hr />

        <p><strong>Meeting:</strong> {certificate.meeting_year || "-"} / Meeting {certificate.meeting_number || "-"}</p>
        <p><strong>Meeting Date:</strong> {certificate.meeting_date ? formatDisplayDate(certificate.meeting_date) : "-"}</p>
        <p><strong>Approval Date:</strong> {certificate.approval_date ? formatDisplayDate(certificate.approval_date) : "-"}</p>
        <p><strong>Decision:</strong> {certificate.decision || "Pending"}</p>

        <hr />

        <p><strong>IAEC Comments:</strong></p>
        <p className="certificate-comments">{certificate.comments || "None"}</p>

        <hr />

        <div className="signature-block">
          <p><strong>IAEC Chairperson</strong></p>
          <p>{certificate.chairperson_name}</p>
        </div>
      </div>

      <div className="wizard-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate(`/iaec/project/${projectId}/review`)}
        >
          Back to Project Review
        </button>

        <button type="button" className="btn" onClick={() => void downloadCertificate()}>
          Download Certificate
        </button>
      </div>
    </div>
  );
}
