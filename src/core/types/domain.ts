import type { ReactNode } from 'react';

export type Status = 'Active' | 'On leave' | 'Draft' | 'Paid' | 'Pending' | 'Overdue' | 'Approved' | 'Posted' | 'Late' | 'Rejected';
export interface Employee { id: string; name: string; initials: string; department: string; position: string; type: string; joinDate: string; salary: string; status: Status; }
export interface Invoice { id: string; customer: string; issueDate: string; dueDate: string; amount: string; balance: string; status: Status; }
export interface NavItem { label: string; icon: string; path: string; }
export interface TableRow { [key: string]: string | Status | ReactNode; }
