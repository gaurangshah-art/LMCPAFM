import api from "./api"; // your axios instance

export async function fetchFormB(protocolNumber: string) {
  const res = await api.get(`/formb/${protocolNumber}`);
  return res.data;
}
