<div align="center">

# 🏢 Indigo ERP — Complete System Accounts Guide

### Nile Horizon Technologies S.A.E
### نايل هورايزون للحلول التكنولوجية ش.م.م

<br />

![Platform](https://img.shields.io/badge/Platform-Indigo_ERP-4f46e5?style=for-the-badge&logo=boxes&logoColor=white)
![Stack](https://img.shields.io/badge/Stack-React_+_.NET_10-61dafb?style=for-the-badge)
![Database](https://img.shields.io/badge/Database-SQL_Server-cc2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)
![Currency](https://img.shields.io/badge/Currency-EGP_🇪🇬-22c55e?style=for-the-badge)
![License](https://img.shields.io/badge/License-Enterprise-8b5cf6?style=for-the-badge)

<br />

**A comprehensive Accounting & HR Enterprise Resource Planning system built for Egyptian companies.**

*Designed with Egyptian tax compliance (14% VAT), Egyptian banking integration (CIB, NBE, Banque Misr), and role-based access control for enterprise teams.*

</div>

---

## 🚀 Quick Start

```bash
# 1. Start the Backend API (ASP.NET Core 10 + SQL Server)
dotnet run --project backend/src/IndigoERP.API --launch-profile http

# 2. Start the Frontend (Vite + React + TypeScript)
npm run dev

# 3. Seed Egyptian enterprise data
curl -X POST http://localhost:5250/api/seed/egyptian

# 4. Open in browser
# → http://localhost:5173
```

---

## 🔐 System Accounts — Quick Reference

<table>
<thead>
<tr>
<th>🎭 Role</th>
<th>👤 Name</th>
<th>📧 Email</th>
<th>🔑 Password</th>
<th>📁 Scope</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>🛡️ Administrator</strong></td>
<td>Saif AlDin Ahmed</td>
<td><code>admin@indigo.co</code></td>
<td><code>Admin@123456</code></td>
<td>Full System Access</td>
</tr>
<tr>
<td><strong>👥 HR Manager</strong></td>
<td>Ahmed Mansour</td>
<td><code>hr@indigo.co</code></td>
<td><code>Hr@123456</code></td>
<td>HR, Payroll, Benefits</td>
</tr>
<tr>
<td><strong>💰 Finance Manager</strong></td>
<td>Tarek El-Sayed</td>
<td><code>finance@indigo.co</code></td>
<td><code>Finance@123456</code></td>
<td>Finance, Invoicing, Tax</td>
</tr>
<tr>
<td><strong>📒 Accountant</strong></td>
<td>Mariam Shenouda</td>
<td><code>accountant@indigo.co</code></td>
<td><code>Accountant@123456</code></td>
<td>Accounting & Reports</td>
</tr>
</tbody>
</table>

> 💡 **Tip:** On the login page, click any account card on the left panel to sign in instantly — no need to type credentials!

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Indigo ERP System                       │
├──────────────────────┬─────────────────────────────────────┤
│   Frontend (Vite)    │       Backend (ASP.NET Core 10)     │
│                      │                                      │
│  React 19 + TS       │   RESTful API Controllers           │
│  SPA with Router     │   Entity Framework Core 10          │
│  Role-Based Sidebar  │   JWT Authentication                │
│  EGP Currency Format │   RBAC Permission System            │
│  Responsive Design   │   SQL Server Database               │
│  Dark Mode Support   │   Egyptian Data Seeder              │
│                      │                                      │
│  Port: 5173          │   Port: 5250                        │
└──────────────────────┴─────────────────────────────────────┘
```

---

## 📊 Module Access Matrix

| Module | Administrator | HR Manager | Finance Manager | Accountant |
|:-------|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Employees | ✅ | ✅ | ✅ | ❌ |
| Departments | ✅ | ✅ | ❌ | ❌ |
| Positions | ✅ | ✅ | ❌ | ❌ |
| Attendance | ✅ | ✅ | ❌ | ❌ |
| Leave Management | ✅ | ✅ | ❌ | ❌ |
| Payroll | ✅ | ✅ | ✅ | ❌ |
| Recruitment | ✅ | ✅ | ❌ | ❌ |
| Performance | ✅ | ✅ | ❌ | ❌ |
| Benefits | ✅ | ✅ | ❌ | ❌ |
| Documents | ✅ | ✅ | ❌ | ❌ |
| Finance Dashboard | ✅ | ❌ | ✅ | ✅ |
| Chart of Accounts | ✅ | ❌ | ✅ | ✅ |
| General Ledger | ✅ | ❌ | ✅ | ✅ |
| Journal Entries | ✅ | ❌ | ✅ | ✅ |
| Invoices | ✅ | ❌ | ✅ | ✅ |
| Receivables | ✅ | ❌ | ✅ | ✅ |
| Payables | ✅ | ❌ | ✅ | ✅ |
| Expenses | ✅ | ❌ | ✅ | ✅ |
| Payments | ✅ | ❌ | ✅ | ✅ |
| Budgets | ✅ | ❌ | ✅ | ✅ |
| Tax | ✅ | ❌ | ✅ | ❌ |
| Reports | ✅ | ✅ | ✅ | ✅ |
| Users | ✅ | ❌ | ❌ | ❌ |
| Roles & Permissions | ✅ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ |

---

## 🏢 Company Profile

| Property | Value |
|:---------|:------|
| **Company Name** | Nile Horizon Technologies S.A.E (نايل هورايزون للحلول التكنولوجية ش.م.م) |
| **Legal Entity** | Société Anonyme Egyptienne (S.A.E) |
| **Headquarters** | Building 12B, Smart Village, KM 28 Cairo-Alexandria Desert Road, Giza, Egypt |
| **Tax Registration** | 412-985-632 |
| **Currency** | Egyptian Pound (EGP — ج.م) |
| **VAT Rate** | 14% (Egyptian Value Added Tax) |
| **Fiscal Year** | January 1 — December 31 |

---

## 🏦 Banking Partners

| Bank | Account Code | Type |
|:-----|:------------|:-----|
| Commercial International Bank (CIB) | 1020 | Operating Account |
| National Bank of Egypt (NBE) | 1021 | Payroll Account |
| Banque Misr | 1022 | Tax & Government |

---

## 🤝 Corporate Clients

| Client | Industry | Invoice Value (EGP) |
|:-------|:---------|:-------------------|
| Vodafone Egypt Telecommunications SAE | Telecom | 185,000 |
| Raya Information Technology | IT Services | 95,000 |
| Fawry Banking & Payment Technology | FinTech | 140,000 |
| Banque Misr Tech Center | Banking IT | 120,000 |
| Telecom Egypt | Infrastructure | — |

---

## 🏭 Vendors & Suppliers

| Vendor | Service Category |
|:-------|:----------------|
| Telecom Egypt Datacenter Services | Data Center & Hosting |
| Smart Village Facilities Management | Office Space & Facilities |
| Tradeline Stores | IT Equipment & Hardware |
| AXA Egypt Insurance | Group Health Insurance |
| Elsewedy Electric | Electrical Infrastructure |

---

## 👨‍💼 Egyptian Workforce

| # | Name | Position | Department | Monthly Salary (EGP) |
|:--|:-----|:---------|:-----------|:-------------------|
| 1 | Dr. Hazem El-Shamy | Chief Executive Officer | Executive Management | 85,000 |
| 2 | Ahmed Mansour | HR Director / Manager | Human Resources | 45,000 |
| 3 | Nouran El-Gohary | HR Specialist | Human Resources | 20,000 |
| 4 | Tarek El-Sayed | Finance Director / Manager | Finance & Accounting | 52,000 |
| 5 | Mariam Shenouda | Senior Accountant | Finance & Accounting | 26,000 |
| 6 | Hoda Soliman | Senior Accountant | Finance & Accounting | 24,000 |
| 7 | Karim Farouk | Lead Software Architect | Software Engineering | 58,000 |
| 8 | Youssef Radwan | Senior Full-Stack Engineer | Software Engineering | 38,000 |
| 9 | Omar Abdel-Rahman | DevOps & Cloud Engineer | Software Engineering | 35,000 |
| 10 | Salma El-Mahdy | Technical Support Specialist | Customer Operations | 18,000 |

**Total Monthly Payroll:** EGP 401,000 (Gross) | EGP 336,540 (Net after tax & deductions)

---

## 📂 Detailed Account Guides

For complete documentation on each account's features, permissions, and workflows:

| Guide | File |
|:------|:-----|
| 🛡️ Administrator | [`01_ADMINISTRATOR.md`](./01_ADMINISTRATOR.md) |
| 👥 HR Manager | [`02_HR_MANAGER.md`](./02_HR_MANAGER.md) |
| 💰 Finance Manager | [`03_FINANCE_MANAGER.md`](./03_FINANCE_MANAGER.md) |
| 📒 Accountant | [`04_ACCOUNTANT.md`](./04_ACCOUNTANT.md) |

---

## 🛠️ Technical Stack

| Layer | Technology |
|:------|:-----------|
| **Frontend** | React 19, TypeScript, Vite 6, React Router 7 |
| **Styling** | Custom CSS Design System with CSS Variables, Bootstrap Icons |
| **Backend** | ASP.NET Core 10, C# 13 |
| **Database** | SQL Server (Entity Framework Core 10, Code-First) |
| **Authentication** | JWT Bearer Tokens with role-based claims |
| **Authorization** | RBAC (Role-Based Access Control) with granular permissions |
| **API** | RESTful JSON API with pagination, filtering, and sorting |

---

## 🔐 Security Features

- **JWT Authentication** with automatic token refresh
- **Role-Based Access Control (RBAC)** — 4 roles with granular permissions
- **Audit Logging** — every action is tracked with timestamp and user
- **Password Policy** — minimum 8 characters, requires uppercase, lowercase, digit, and special character
- **CORS Protection** — configured whitelist for frontend origin
- **SQL Injection Prevention** — parameterized queries via Entity Framework

---

<div align="center">

---

### 🇪🇬 Built for Egyptian Enterprise Excellence

**Indigo ERP** — Comprehensive Accounting & HR System

*Nile Horizon Technologies S.A.E*

*Building 12B, Smart Village, KM 28 Cairo-Alex Desert Road, Giza, Egypt*

---

© 2026 Nile Horizon Technologies S.A.E. All rights reserved.

</div>
