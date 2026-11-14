import { api } from '../api/apiClient';
import type { DepartmentDto, PagedResult, PaginationParams, PositionDto } from '../api/types';

export const departmentService = {
  getAll(params?: PaginationParams) {
    return api.get<PagedResult<DepartmentDto>>('/departments', {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 100,
    });
  },

  create(request: { name: string; description?: string; annualBudget?: number }) {
    return api.post<DepartmentDto>('/departments', request);
  },
};

export const positionService = {
  getAll(params?: PaginationParams) {
    return api.get<PagedResult<PositionDto>>('/positions', {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 100,
    });
  },
};
