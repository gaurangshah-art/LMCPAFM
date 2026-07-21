import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function IaecApprovalCertificate() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [certificate, setCertificate] = useState(null);

  async function loadCertificate() {
    setLoading(true);
    try {
      const res = await api.get(`/iaec/project/${projectId}/certificate`);
      setCertificate(res.data);
    } catch {
      alert("Failed to load certificate.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCertificate();
  }, [projectId]);

  async function downloadCertificate() {
    try {
      const res = await api.get(`/iaec/project/${projectId}/certificate/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `IAEC_Approval_${certificate.lmcp_iaec_id}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch {
      alert("Failed to download certificate.");
    }
  }

  if (loading || !certificate) {
    return (
      <div className="page-card">
        <p>Loading certificate...</p>
      </div>
    );
  }

  return (
    <div className="page-card certificate-preview">
      <header className="section-header">
        <h2>IAEC Approval Certificate</h2>
        <p>Official approval document for the project.</p>
      </header>

      <div className="certificate-box">
        <h3 className="certificate-title">L. M. College of Pharmacy</h3>
        <p className="certificate-subtitle">Institutional Animal Ethics Committee (IAEC)</p>
        <hr />

        <p><strong>LMCP/IAEC ID:</strong> {certificate.lmcp_iaec_id}</p>
        <p><strong>Project Title:</strong> {certificate.title}</p>
        <p><strong>Principal Investigator:</strong> {certificate.investigator}</p>
        <p><strong>Department:</strong> {certificate.department}</p>

        <hr />

        <p><strong>Meeting:</strong> {certificate.meeting_year} / Meeting {certificate.meeting_number}</p>
        <p><strong>Meeting Date:</strong> {certificate.meeting_date}</p>
        <p><strong>Approval Date:</strong> {certificate.approval_date}</p>

        <hr />

        <p><strong>IAEC Comments:</strong></p>
        <p className="certificate-comments">{certificate.comments}</p>

        <hr />

        <div className="signature-block">
          <p><strong>IAEC Chairperson</strong></p>
          <p>{certificate.chairperson_name}</p>
        </div>
      </div>

      <div className="wizard-actions">
        <button className="btn-secondary" onClick={() => navigate(`/iaec/project/${projectId}`)}>
          ← Back to Project Review
        </button>

        <button className="btn" onClick={downloadCertificate}>
          Download Certificate →
        </button>
      </div>
    </div>
  );
}
