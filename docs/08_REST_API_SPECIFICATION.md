# 🌐 RESTful API Engineering Specification
## Standardized HTTP Contracts, Payloads, Endpoints & Status Codes
### Comprehensive System Analysis & Design Specification
**Project Repository:** [Saifahmed3993/ERP-System-with-AI](https://github.com/Saifahmed3993/ERP-System-with-AI)  
**Version:** 2.0.0 — REST API Architecture  
**Protocol:** HTTPS / TLS 1.3  
**Base URL:** `https://api.indigo-erp.com/api` (Local Dev: `http://localhost:5250/api`)

---

## Table of Contents
1. [API Design Standards & Protocols](#1-api-design-standards--protocols)
2. [Standard Response Envelopes & Error Formats](#2-standard-response-envelopes--error-formats)
3. [Authentication & Session Endpoints](#3-authentication--session-endpoints)
4. [Human Resources & Attendance Endpoints](#4-human-resources--attendance-endpoints)
5. [Payroll & Compensation Endpoints](#5-payroll--compensation-endpoints)
6. [Financial Ledger & Journal Endpoints](#6-financial-ledger--journal-endpoints)
7. [Invoicing, Billing & Payables Endpoints](#7-invoicing-billing--payables-endpoints)
8. [AI Intelligence & Forecasting Endpoints](#8-ai-intelligence--forecasting-endpoints)
9. [Governance, RBAC & Audit Endpoints](#9-governance-rbac--audit-endpoints)

---

## 1. API Design Standards & Protocols

The Indigo ERP API conforms to strict RESTful design conventions:
- **HTTP Methods:** `GET` (Idempotent read), `POST` (Creation/Action), `PUT` (Full replacement), `PATCH` (Partial update), `DELETE` (Soft deletion).
- **Resource Naming:** Pluralized lowercase nouns (e.g., `/api/hr/employees`, `/api/finance/invoices`).
- **Standard Header:** `Authorization: Bearer <JWT>` required for all protected routes.
- **Date Formatting:** ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.fffZ`).
- **Currency Values:** Sent as precise decimal floating values in Egyptian Pounds (`EGP`).

---

## 2. Standard Response Envelopes & Error Formats

### 2.1 Success Response Wrapper
```json
{
  "success": true,
  "data": { ... },
  "message": "Resource retrieved successfully",
  "timestamp": "2026-10-03T14:30:00Z"
}
```

### 2.2 Standard Paginated List Envelope
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalCount": 184,
    "totalPages": 8
  },
  "timestamp": "2026-10-03T14:30:00Z"
}
```

### 2.3 Error Envelope (RFC 7807 Compliant)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Debit and credit entries must balance.",
    "details": [
      { "field": "DebitTotal", "issue": "Total Debit 105,000 does not equal Credit 100,000" }
    ]
  },
  "timestamp": "2026-10-03T14:30:00Z"
}
```

---

## 3. Authentication & Session Endpoints

### `POST /api/auth/login`
- **Description:** Authenticates user credentials and returns access token + refresh token.
- **Request Body:**
```json
{
  "email": "finance@indigo.co",
  "password": "Finance@123456"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "d8f498c1-4b11-477c-a0e2-938b8719cb42",
    "expiresIn": 900,
    "user": {
      "id": "e4a2c918-6e54-47b8-89c0-2f9810bb7712",
      "fullName": "Tarek El-Sayed",
      "email": "finance@indigo.co",
      "role": "FinanceManager",
      "permissions": ["Finance.Read", "Finance.Write", "Payroll.Read", "Reports.Export"]
    }
  }
}
```

### `POST /api/auth/refresh`
- **Description:** Rotates expired JWT using valid refresh token.
- **Request Body:**
```json
{
  "refreshToken": "d8f498c1-4b11-477c-a0e2-938b8719cb42"
}
```

---

## 4. Human Resources & Attendance Endpoints

| Method | Endpoint | Description | Permissions Required |
|:---|:---|:---|:---|
| `GET` | `/api/hr/employees` | List paginated employees with filters | `Employees.View` |
| `POST` | `/api/hr/employees` | Create a new employee profile | `Employees.Create` |
| `GET` | `/api/hr/employees/{id}` | Retrieve detailed employee record | `Employees.View` |
| `PUT` | `/api/hr/employees/{id}` | Update employee demographic/salary | `Employees.Edit` |
| `DELETE`| `/api/hr/employees/{id}` | Soft delete / terminate employee | `Employees.Delete` |
| `POST` | `/api/hr/attendance/check-in` | Punch daily shift check-in | `Attendance.Self` |
| `POST` | `/api/hr/attendance/check-out`| Punch shift check-out | `Attendance.Self` |
| `GET` | `/api/hr/attendance` | Query department timesheets | `Attendance.View` |
| `POST` | `/api/hr/leave/requests` | Submit employee leave application | `Leave.Apply` |
| `PUT` | `/api/hr/leave/requests/{id}/approve` | Approve pending leave | `Leave.Approve` |

### Sample: Check-In Request (`POST /api/hr/attendance/check-in`)
```json
{
  "employeeId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "attendanceId": "9921bcfa-7612-4211-8931-e1245678abcd",
    "date": "2026-10-03",
    "checkIn": "08:58:12",
    "status": "Present",
    "isLate": false
  },
  "message": "Check-in recorded successfully"
}
```

---

## 5. Payroll & Compensation Endpoints

| Method | Endpoint | Description | Permissions Required |
|:---|:---|:---|:---|
| `POST` | `/api/hr/payroll/calculate` | Execute batch calculation for period | `Payroll.Calculate` |
| `GET` | `/api/hr/payroll/periods/{period}` | Get summary and employee breakdown | `Payroll.View` |
| `POST` | `/api/hr/payroll/approve` | Approve period & dispatch GL journal | `Payroll.Approve` |
| `GET` | `/api/hr/payroll/payslips/{id}` | Retrieve individual payslip DTO | `Payroll.ViewSelf` |

### Sample: Calculate Payroll (`POST /api/hr/payroll/calculate`)
```json
{
  "period": "2026-10",
  "departmentId": null
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "2026-10",
    "totalEmployees": 10,
    "grossTotal": 401000.00,
    "totalSocialInsurance": 28650.00,
    "totalTaxWithholding": 35810.00,
    "netTotal": 336540.00,
    "status": "Draft"
  }
}
```

---

## 6. Financial Ledger & Journal Endpoints

| Method | Endpoint | Description | Permissions Required |
|:---|:---|:---|:---|
| `GET` | `/api/finance/accounts` | Retrieve hierarchical Chart of Accounts | `Accounts.View` |
| `POST` | `/api/finance/accounts` | Create a new general ledger account | `Accounts.Manage` |
| `GET` | `/api/finance/journal-entries`| List double-entry journal vouchers | `Journal.View` |
| `POST` | `/api/finance/journal-entries`| Post balanced journal voucher | `Journal.Post` |
| `GET` | `/api/finance/ledger` | Query detailed account activity stream | `Reports.View` |

### Sample: Post Journal Voucher (`POST /api/finance/journal-entries`)
```json
{
  "entryDate": "2026-10-03",
  "reference": "ADJ-2026-10",
  "description": "Prepaid rent amortization - Smart Village Building 12B",
  "lines": [
    {
      "accountId": "5020-Guid",
      "debit": 45000.00,
      "credit": 0.00,
      "memo": "Office Rent Expense - October"
    },
    {
      "accountId": "1050-Guid",
      "debit": 0.00,
      "credit": 45000.00,
      "memo": "Prepaid Rent Asset Amortization"
    }
  ]
}
```

---

## 7. Invoicing, Billing & Payables Endpoints

| Method | Endpoint | Description | Permissions Required |
|:---|:---|:---|:---|
| `GET` | `/api/finance/invoices` | List invoices with status, totals, VAT | `Invoices.View` |
| `POST` | `/api/finance/invoices` | Create invoice with automatic 14% VAT | `Invoices.Create` |
| `POST` | `/api/finance/invoices/{id}/payments` | Record customer bank payment | `Invoices.Settle` |
| `GET` | `/api/finance/customers` | Query customer directory & balances | `Customers.View` |
| `GET` | `/api/finance/vendors` | Query vendor directory & payables | `Vendors.View` |
| `POST` | `/api/finance/expenses` | Record operational expense voucher | `Expenses.Create` |

---

## 8. AI Intelligence & Forecasting Endpoints

| Method | Endpoint | Description | Permissions Required |
|:---|:---|:---|:---|
| `GET` | `/api/ai/cash-flow-forecast` | Get 30/60/90-day predictive liquidity curve | `Finance.Forecast` |
| `POST` | `/api/ai/ocr-extract` | Upload scanned invoice/receipt for OCR parsing | `Expenses.Create` |
| `GET` | `/api/ai/attendance-anomalies` | Query flagged suspicious check-ins | `Attendance.Audit` |
| `POST` | `/api/ai/copilot/query` | Natural language text-to-SQL query | `Reports.Copilot` |

### Sample: AI Cash Forecast Query (`GET /api/ai/cash-flow-forecast?horizon=30`)
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "horizonDays": 30,
    "baselineCashBalance": 1850000.00,
    "projectedMinimum": 1120000.00,
    "breachWarning": false,
    "projections": [
      {
        "date": "2026-10-04",
        "predictedBalance": 1845000.00,
        "upperConfidence": 1890000.00,
        "lowerConfidence": 1800000.00,
        "expectedInflow": 25000.00,
        "expectedOutflow": 30000.00
      }
    ]
  }
}
```

---

## 9. Governance, RBAC & Audit Endpoints

| Method | Endpoint | Description | Permissions Required |
|:---|:---|:---|:---|
| `GET` | `/api/admin/users` | List system users and status | `Admin.Users` |
| `GET` | `/api/admin/roles` | List roles and assigned permissions | `Admin.Roles` |
| `PUT` | `/api/admin/roles/{id}/permissions` | Update permission claims for role | `Admin.Roles` |
| `GET` | `/api/admin/audit-logs` | Search immutable audit log records | `Admin.Audit` |
| `POST` | `/api/seed/egyptian` | Seed Egyptian enterprise demo records | `Admin.Super` |

---
*End of RESTful API Engineering Specification*
