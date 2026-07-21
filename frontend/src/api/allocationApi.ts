import axios from "../utils/axios";

export const getAllocation = (id: string) =>
  axios.get(`/allocation/${id}`);

export const updateAllocationComment = (id: string, comment: string) =>
  axios.put(`/allocation/${id}/comment`, { comment });

export const confirmAllocation = (id: string) =>
  axios.post(`/allocation/${id}/confirm`);

export const adjustAllocation = (id: string, data: any) =>
  axios.post(`/allocation/${id}/adjust`, data);
