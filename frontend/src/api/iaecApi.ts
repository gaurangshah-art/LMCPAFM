import { apiClient } from "./client";
import type {
  IAECProject,
  IAECProjectCreate,
  InvestigatorProjectSummary,
  ExperimentGroup,
  ExperimentGroupCreate,
  AnimalExperiment,
  AnimalExperimentCreate,
  IAECMeetingRecord,
  IAECMeetingCreate,
  FormBWithMeeting,
  FormBMeetingDecisionUpsert,
  IAECApprovalCertificate,
} from "./types";

export async function createProject(payload: IAECProjectCreate): Promise<IAECProject> {
  const { data } = await apiClient.post<IAECProject>("/iaec/project", payload);
  return data;
}

export async function getProjects(): Promise<IAECProject[]> {
  const { data } = await apiClient.get<IAECProject[]>("/iaec/project");
  return data;
}

// ⭐ Investigator dashboard summaries (Form B + project metadata)
export async function getInvestigatorProjectSummaries(
  investigatorId: number,
): Promise<InvestigatorProjectSummary[]> {
  const { data } = await apiClient.get<InvestigatorProjectSummary[]>(
    `/iaec/project/investigator/${investigatorId}`,
  );
  return data;
}

/** @deprecated Use getInvestigatorProjectSummaries for dashboard views. */
export async function getProjectsByInvestigator(
  investigatorId: number,
): Promise<InvestigatorProjectSummary[]> {
  return getInvestigatorProjectSummaries(investigatorId);
}

export async function getProjectCertificate(projectId: number): Promise<IAECApprovalCertificate> {
  const { data } = await apiClient.get<IAECApprovalCertificate>(
    `/iaec/project/${projectId}/certificate`,
  );
  return data;
}

export async function downloadProjectCertificate(projectId: number): Promise<void> {
  const response = await apiClient.get(`/iaec/project/${projectId}/certificate/download`, {
    responseType: "blob",
  });
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `iaec_certificate_${projectId}.pdf`;
  link.click();
  window.URL.revokeObjectURL(blobUrl);
}

export async function createGroup(payload: ExperimentGroupCreate): Promise<ExperimentGroup> {
  const { data } = await apiClient.post<ExperimentGroup>("/iaec/group", payload);
  return data;
}

export async function getGroupsByProject(projectId: number): Promise<ExperimentGroup[]> {
  const { data } = await apiClient.get<ExperimentGroup[]>(`/iaec/group/${projectId}`);
  return data;
}

export async function createIAECExperiment(payload: AnimalExperimentCreate): Promise<AnimalExperiment> {
  const { data } = await apiClient.post<AnimalExperiment>("/iaec/experiment", payload);
  return data;
}

export async function getIAECExperimentsByGroup(groupId: number): Promise<AnimalExperiment[]> {
  const { data } = await apiClient.get<AnimalExperiment[]>(`/iaec/experiment/${groupId}`);
  return data;
}

// -----------------------------
// IAEC PROJECT — FULL CRUD
// -----------------------------

export async function getProjectById(projectId: number): Promise<IAECProject> {
  const { data } = await apiClient.get<IAECProject>(`/iaec/project/${projectId}`);
  return data;
}

export async function updateProject(
  projectId: number,
  payload: Partial<IAECProjectCreate>
): Promise<IAECProject> {
  const { data } = await apiClient.put<IAECProject>(`/iaec/project/${projectId}`, payload);
  return data;
}

export async function deleteProject(projectId: number): Promise<void> {
  await apiClient.delete(`/iaec/project/${projectId}`);
}

// -----------------------------
// IAEC PROJECT — APPROVAL FLOW
// -----------------------------

export async function approveProject(projectId: number): Promise<IAECProject> {
  const { data } = await apiClient.post<IAECProject>(`/iaec/project/${projectId}/approve`);
  return data;
}

export async function rejectProject(projectId: number, reason: string): Promise<IAECProject> {
  const { data } = await apiClient.post<IAECProject>(`/iaec/project/${projectId}/reject`, {
    reason,
  });
  return data;
}

// -----------------------------
// IAEC PROJECT — COMMENTS
// -----------------------------

export async function addProjectComment(
  projectId: number,
  comment: string
): Promise<IAECProject> {
  const { data } = await apiClient.post<IAECProject>(`/iaec/project/${projectId}/comment`, {
    comment,
  });
  return data;
}

// -----------------------------
// EXPERIMENT GROUP — FULL CRUD
// -----------------------------

export async function updateGroup(
  groupId: number,
  payload: Partial<ExperimentGroupCreate>
): Promise<ExperimentGroup> {
  const { data } = await apiClient.put<ExperimentGroup>(`/iaec/group/${groupId}`, payload);
  return data;
}

export async function deleteGroup(groupId: number): Promise<void> {
  await apiClient.delete(`/iaec/group/${groupId}`);
}

// -----------------------------
// ANIMAL EXPERIMENT — FULL CRUD
// -----------------------------

export async function updateIAECExperiment(
  experimentId: number,
  payload: Partial<AnimalExperimentCreate>
): Promise<AnimalExperiment> {
  const { data } = await apiClient.put<AnimalExperiment>(
    `/iaec/experiment/${experimentId}`,
    payload
  );
  return data;
}

export async function deleteIAECExperiment(experimentId: number): Promise<void> {
  await apiClient.delete(`/iaec/experiment/${experimentId}`);
}

// -----------------------------
// IAEC MEETINGS
// -----------------------------

export async function getMeetings(): Promise<IAECMeetingRecord[]> {
  const { data } = await apiClient.get<IAECMeetingRecord[]>("/iaec/meeting");
  return data;
}

export async function createMeeting(payload: IAECMeetingCreate): Promise<IAECMeetingRecord> {
  const { data } = await apiClient.post<IAECMeetingRecord>("/iaec/meeting", payload);
  return data;
}

// -----------------------------
// FORM B — IAEC MEETING WORKFLOW
// -----------------------------

export async function getFormBWithMeeting(): Promise<FormBWithMeeting[]> {
  const { data } = await apiClient.get<FormBWithMeeting[]>("/iaec/form-b-with-meeting");
  return data;
}

export async function assignFormBMeeting(
  formBId: number,
  meetingId: number | null
): Promise<void> {
  await apiClient.patch(`/iaec/form-b/${formBId}/meeting`, { meeting_id: meetingId });
}

export async function generateFormBProtocolNumber(formBId: number): Promise<{ protocol_number: string }> {
  const { data } = await apiClient.post<{ protocol_number: string }>(
    `/iaec/form-b/${formBId}/protocol-number`
  );
  return data;
}

export async function upsertFormBMeetingDecision(
  formBId: number,
  payload: FormBMeetingDecisionUpsert
): Promise<void> {
  await apiClient.put(`/iaec/form-b/${formBId}/decision`, payload);
}

export async function sendFormBMeetingInvitation(formBId: number): Promise<void> {
  await apiClient.post(`/iaec/form-b/${formBId}/send-meeting-invitation`);
}

export async function downloadMeetingSummaryPdf(meetingId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/iaec/meeting/${meetingId}/summary/download`, {
    responseType: "blob",
  });
  return data;
}
