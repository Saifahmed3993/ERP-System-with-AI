import { api } from '../api/apiClient';
import type { InvoiceDto, PagedResult, PaginationParams } from '../api/types';

export const invoiceService = {
  getAll(params?: PaginationParams) {
    return api.get<PagedResult<InvoiceDto>>('/invoices', {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 50,
      search: params?.search,
    });
  },

  getById(id: string) {
    return api.get<InvoiceDto>(`/invoices/${id}`);
  },

  send(id: string) {
    return api.post<InvoiceDto>(`/invoices/${id}/send`);
  },

  cancel(id: string) {
    return api.post<InvoiceDto>(`/invoices/${id}/cancel`);
  }
};
