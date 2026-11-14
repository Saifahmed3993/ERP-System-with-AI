export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDesc?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  roles: string[];
  isActive: boolean;
}

/** A safe, public profile for one of the predefined demo sign-in accounts. */
export interface LoginAccountDto {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiry: string;
  user: UserDto;
}

export interface EmployeeDto {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string;
  position: string;
  employmentType: string;
  joinDate: string;
  monthlySalary: number;
  status: string;
  location: string | null;
  managerName: string | null;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId: string;
  positionId: string;
  employmentType: string;
  joinDate: string;
  monthlySalary: number;
  location?: string;
  managerId?: string;
}

export interface DepartmentDto {
  id: string;
  name: string;
  description: string | null;
  managerName: string | null;
  annualBudget: number;
  employeeCount: number;
  isActive: boolean;
}

export interface PositionDto {
  id: string;
  title: string;
  description: string | null;
  department: string;
  minSalary: number;
  maxSalary: number;
  employeeCount: number;
  isActive: boolean;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
}

export interface HrDashboardDto {
  totalEmployees: number;
  activeEmployees: number;
  onLeave: number;
  newHires: number;
  pendingLeaveRequests: number;
  todayPresent: number;
  todayLate: number;
  todayAbsent: number;
  totalGrossPayroll: number;
  totalNetPayroll: number;
  totalTaxes: number;
}

export interface FinanceDashboardDto {
  revenue: number;
  expenses: number;
  netProfit: number;
  cashBalance: number;
  totalReceivables: number;
  totalPayables: number;
  revenueChange: number;
  expenseChange: number;
}
