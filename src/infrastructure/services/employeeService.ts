import { api } from '../api/apiClient';
import type { CreateEmployeeRequest, EmployeeDto, PagedResult, PaginationParams } from '../api/types';

export const employeeService = {
  getAll(params?: PaginationParams) {
    return api.get<PagedResult<EmployeeDto>>('/employees', {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 50,
      search: params?.search,
      sortBy: params?.sortBy,
      sortDesc: params?.sortDesc,
    });
  },

  getById(id: string) {
    return api.get<EmployeeDto>(`/employees/${id}`);
  },

  create(request: CreateEmployeeRequest) {
    return api.post<EmployeeDto>('/employees', request);
  },

  update(id: string, request: Partial<CreateEmployeeRequest> & { status?: string }) {
    return api.put<EmployeeDto>(`/employees/${id}`, request);
  },

  delete(id: string) {
    return api.delete(`/employees/${id}`);
  },
};
