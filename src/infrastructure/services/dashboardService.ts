import { api } from '../api/apiClient';
import type { FinanceDashboardDto, HrDashboardDto } from '../api/types';

export const dashboardService = {
  getHr() {
    return api.get<HrDashboardDto>('/dashboard/hr');
  },

  getFinance() {
    return api.get<FinanceDashboardDto>('/dashboard/finance');
  },
};
