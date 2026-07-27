import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  downloadSignedProjectCertificate,
  getProjectCertificate,
  uploadSignedProjectCertificate,
} from "../../api/iaecApi";
import type { IAECApprovalCertificate, User } from "../../api/types";
import { formatDisplayDate } from "../../utils/dateFormat";
import { getApiErrorMessage } from "../../api/errors";
import { apiClient } from "../../api/client";

interface IaecApprovalCertificateProps {
  currentUser: User;
}

export function IaecApprovalCertificate({ currentUser }: IaecApprovalCertificateProps) {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<IAECApprovalCertificate | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const canUploadSigned = useMemo(
    () => currentUser.roles.some((role) => ["iaec", "admin", "staff"].includes(role)),
    [currentUser.roles],
  );

  async function loadCertificate() {
    if (!projectId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await getProjectCertificate(Number(projectId));
      setCertificate(data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setCertificate(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCertificate();
  }, [projectId]);

  async function downloadSystemCertificate() {
    if (!projectId || !certificate) return;

    try {
      const response = await apiClient.get(`/iaec/project/${projectId}/certificate/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const prefix = certificate.is_final ? "IAEC_Final_Certificate" : "IAEC_Provisional_Approval";
      link.setAttribute("download", `${prefix}_${certificate.lmcp_iaec_id || projectId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  async function downloadSignedCertificate() {
    if (!projectId || !certificate?.signed_certificate) return;
    try {
      await downloadSignedProjectCertificate(
        Number(projectId),
        certificate.signed_certificate.original_filename,
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  async function handleUploadSigned() {
    if (!projectId || !uploadFile) return;
    try {
      setUploading(true);
      setErrorMessage(null);
      await uploadSignedProjectCertificate(Number(projectId), uploadFile);
      setUploadFile(null);
      await loadCertificate();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setUploading(false);
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

  const isFinal = certificate.is_final;
  const publicationReady = certificate.publication_ready;

  return (
    <div className="page-card certificate-preview">
      <header className="section-header">
        <h2>
          {publicationReady
            ? "Official Signed IAEC Certificate"
            : isFinal
              ? "Digital Compliance Complete — Awaiting Signed Hard Copy"
              : "IAEC Provisional Approval Certificate"}
        </h2>
        <p>
          {publicationReady
            ? "Use the uploaded signed hard copy for journal submission."
            : isFinal
              ? "Experiment records are complete. IAEC will print, sign, and upload the official hard copy."
              : "This document confirms IAEC approval only until experimentation is fully logged."}
        </p>
      </header>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      {!isFinal && certificate.disclaimer ? (
        <div className="certificate-disclaimer-banner">
          <strong>{certificate.disclaimer}</strong>
        </div>
      ) : null}

      {isFinal && !publicationReady && certificate.publication_note ? (
        <div className="info-card warning-card">
          <strong>Signed hard copy pending</strong>
          <p>{certificate.publication_note}</p>
          <p>
            The official certificate must bear signatures of the <strong>IAEC Chairperson</strong>,{" "}
            <strong>CPCSEA nominee</strong>, and <strong>Member Secretary</strong>.
          </p>
        </div>
      ) : null}

      {publicationReady && certificate.publication_note ? (
        <div className="info-card compact-info-card">
          <strong>Journal submission document</strong>
          <p>{certificate.publication_note}</p>
          {certificate.signed_certificate ? (
            <p>
              Uploaded by {certificate.signed_certificate.uploaded_by_name ?? "IAEC"} on{" "}
              {certificate.signed_certificate.uploaded_at
                ? formatDisplayDate(certificate.signed_certificate.uploaded_at)
                : "-"}
            </p>
          ) : null}
        </div>
      ) : null}

      {!isFinal && certificate.completion_status?.blocking_reasons?.length ? (
        <div className="info-card warning-card">
          <strong>Final certificate will be available when:</strong>
          <ul>
            {certificate.completion_status.blocking_reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p>
            <Link to={`/projects/${projectId}`}>Open project workspace</Link> to complete planning and
            experiment records.
          </p>
        </div>
      ) : null}

      <div className={`certificate-box ${publicationReady ? "certificate-box-final" : isFinal ? "certificate-box-final" : "certificate-box-provisional"}`}>
        <h3 className="certificate-title">{certificate.establishment_name || "L. M. College of Pharmacy"}</h3>
        <p className="certificate-subtitle">Institutional Animal Ethics Committee (IAEC)</p>
        {certificate.cpcsea_registration_number ? (
          <p className="certificate-subtitle">CPCSEA Reg. No. {certificate.cpcsea_registration_number}</p>
        ) : null}
        <hr />

        <p><strong>Certificate type:</strong> {publicationReady ? "Signed hard copy (official)" : isFinal ? "Digital compliance / awaiting signature" : "Provisional / approval only"}</p>
        <p><strong>LMCP/IAEC ID:</strong> {certificate.lmcp_iaec_id || "Pending"}</p>
        <p><strong>Project Title:</strong> {certificate.title}</p>
        <p><strong>Principal Investigator:</strong> {certificate.investigator}</p>
        <p><strong>Department:</strong> {certificate.department || "-"}</p>

        <hr />

        <p><strong>Meeting:</strong> {certificate.meeting_year || "-"} / Meeting {certificate.meeting_number || "-"}</p>
        <p><strong>Meeting Date:</strong> {certificate.meeting_date ? formatDisplayDate(certificate.meeting_date) : "-"}</p>
        <p><strong>Approval Date:</strong> {certificate.approval_date ? formatDisplayDate(certificate.approval_date) : "-"}</p>
        <p><strong>Decision:</strong> {certificate.decision || "Pending"}</p>

        {certificate.usage_summary ? (
          <>
            <hr />
            <p><strong>Planned animals:</strong> {certificate.usage_summary.planned_animals}</p>
            <p><strong>Allocated animals:</strong> {certificate.usage_summary.allocated_animals}</p>
            <p><strong>Logged in experiments:</strong> {certificate.usage_summary.logged_animals}</p>
          </>
        ) : null}

        <hr />
        <p><strong>IAEC Comments:</strong></p>
        <p className="certificate-comments">{certificate.comments || "None"}</p>
      </div>

      {canUploadSigned && isFinal ? (
        <section className="dashboard-section">
          <h3>Upload Signed Hard Copy (IAEC)</h3>
          <p>Upload the scanned PDF or image after Chairperson, CPCSEA nominee, and Member Secretary have signed.</p>
          <div className="form-grid">
            <label className="full-width">
              Signed certificate scan
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn"
            disabled={!uploadFile || uploading}
            onClick={() => void handleUploadSigned()}
          >
            {uploading ? "Uploading..." : certificate.signed_certificate ? "Replace Signed Certificate" : "Upload Signed Certificate"}
          </button>
        </section>
      ) : null}

      <div className="wizard-actions">
        <button type="button" className="btn-secondary" onClick={() => navigate(`/projects/${projectId}`)}>
          Project Workspace
        </button>

        {publicationReady ? (
          <button type="button" className="btn" onClick={() => void downloadSignedCertificate()}>
            Download Official Signed Certificate
          </button>
        ) : null}

        <button type="button" className="btn-secondary" onClick={() => void downloadSystemCertificate()}>
          {isFinal ? "Download System Compliance PDF" : "Download Provisional Certificate"}
        </button>
      </div>
    </div>
  );
}
