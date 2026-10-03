# 🔄 Process Modeling & Data Flow Diagrams (DFD)
## Structured Process Specifications for Indigo ERP with AI
### Enterprise Client: Nile Horizon Technologies S.A.E
**Project Repository:** [Saifahmed3993/ERP-System-with-AI](https://github.com/Saifahmed3993/ERP-System-with-AI)  
**Version:** 2.0.0 — Comprehensive Process Architecture

---

## Table of Contents
1. [Introduction to Structured Process Modeling](#1-introduction-to-structured-process-modeling)
2. [Context Diagram (DFD Level 0 / Environmental Boundary)](#2-context-diagram-dfd-level-0--environmental-boundary)
3. [DFD Level 0 (System Decomposition)](#3-dfd-level-0-system-decomposition)
4. [DFD Level 1: Subsystem Process Decompositions](#4-dfd-level-1-subsystem-process-decompositions)
   - [4.1 Subsystem 1.0 & 2.0: HR, Attendance & Leave Workflow](#41-subsystem-10--20-hr-attendance--leave-workflow)
   - [4.2 Subsystem 3.0: Payroll Calculation Engine & GL Dispatch](#42-subsystem-30-payroll-calculation-engine--gl-dispatch)
   - [4.3 Subsystem 4.0 & 5.0: Invoicing, Payments & General Ledger](#43-subsystem-40--50-invoicing-payments--general-ledger)
   - [4.4 Subsystem 6.0: AI Intelligence Hub (OCR & Predictive Pipeline)](#44-subsystem-60-ai-intelligence-hub-ocr--predictive-pipeline)
5. [Data Flow Dictionary](#5-data-flow-dictionary)

---

## 1. Introduction to Structured Process Modeling

Data Flow Modeling maps the movement, transformation, and storage of information throughout the enterprise. In **Indigo ERP with AI**, data flows bridge operational actions (such as an employee punching a time-clock or an accountant scanning an invoice) with automated backend accounting equations and predictive artificial intelligence models.

Notation used complies with the standard **Gane & Sarson / Yourdon** methodologies:
- **External Entities (Squares):** External actors, roles, or third-party institutions providing inputs or consuming outputs.
- **Processes (Rounded Rectangles / Circles):** Business logic and algorithms transforming data.
- **Data Stores (Open Rectangles / Cylinders):** ACID-compliant persistent database tables.
- **Data Flows (Arrows):** Directed packets of structured data moving between entities, processes, and stores.

---

## 2. Context Diagram (DFD Level 0 / Environmental Boundary)

The Context Diagram defines the net organizational boundary of the system, isolating internal ERP operations from external actors and partner systems.

### 2.1 Environmental Boundary Diagram

```mermaid
flowchart TD
    %% External Entities
    EMP["👤 Employee"]
    HRM["👥 HR Manager / Specialist"]
    ACT["📒 Senior Accountant"]
    FM["💰 Finance Manager / CFO"]
    ADM["🛡️ System Administrator"]
    ETA["🏛️ Egyptian Tax Authority (ETA)"]
    BNK["🏦 Commercial Banks (CIB / NBE)"]
    AI_EXT["🤖 Cloud AI Inference Services"]

    %% Central Process
    ERP(("🏢 0.0<br/>Indigo ERP<br/>System with AI"))

    %% Data Flows
    EMP -->|Punch Timestamps, Leave Requests| ERP
    ERP -->|Personal Payslips, Leave Balance, Alerts| EMP

    HRM -->|Employee Profiles, Policies, Payroll Approval| ERP
    ERP -->|Attendance Summaries, Attrition Flags, Rosters| HRM

    ACT -->|Journal Entries, Vendor Bills, Customer Invoices| ERP
    ERP -->|Trial Balance, Ledger Statements, Reconciliations| ACT

    FM -->|Budget Approvals, Financial Thresholds| ERP
    ERP -->|Predictive Cash Flow, P&L, Executive KPIs| FM

    ADM -->|User Accounts, Role Grants, System Configurations| ERP
    ERP -->|Audit Logs, System Health, Exception Telemetry| ADM

    ERP -->|14% VAT Filing Data, Withholding Tax Summaries| ETA
    ERP -->|Salary Disbursal Instruction File (ACH / WFPS)| BNK
    BNK -->|Bank Statement Settlement Feed| ERP

    ERP -->|Scanned Receipts, Anonymized Financial Records| AI_EXT
    AI_EXT -->|OCR Structured JSON, Time-Series Predictions| ERP
```

### 2.2 Visual Artifact Reference
The original conceptual model for the context boundary is captured in the system design archive:
![Figure 1: Context Diagram](assets/figures/figure1_context_diagram.png)

---

## 3. DFD Level 0 (System Decomposition)

DFD Level 0 decomposes the core system into six foundational macro-processes and seven primary relational data stores.

```mermaid
flowchart TB
    %% External Entities
    EMP["👤 Employee"]
    HR["👥 HR Department"]
    FIN["💰 Finance & Accounts"]
    EXEC["👔 Management"]
    ADMIN["🛡️ Admin"]

    %% Processes
    P1["1.0 HR & Workforce<br/>Management"]
    P2["2.0 Attendance & Leave<br/>Processing"]
    P3["3.0 Payroll Calculation<br/>& Tax Engine"]
    P4["4.0 General Ledger &<br/>Journal Processing"]
    P5["5.0 Billing, Receivables<br/>& Payables"]
    P6["6.0 AI Predictive &<br/>OCR Engine"]

    %% Data Stores
    D1[("D1: Employees & Org Master")]
    D2[("D2: Attendance & Leave Logs")]
    D3[("D3: Payroll & Payslips")]
    D4[("D4: Chart of Accounts & GL")]
    D5[("D5: Invoices, Bills & Payments")]
    D6[("D6: AI Metadata & Forecasts")]
    D7[("D7: Security & Audit Vault")]

    %% P1 Flows
    HR -->|Create / Update Profile| P1
    P1 -->|Store Record| D1
    D1 -->|Read Employee Details| P1
    P1 -->|Roster & Org Charts| HR

    %% P2 Flows
    EMP -->|Punch In/Out & Leave App| P2
    P2 -->|Log Time & Deduct Balance| D2
    D1 -->|Validate Employment Status| P2
    D2 -->|Monthly Hours & Overtime| P3
    P2 -->|Approval Notification| EMP

    %% P3 Flows
    D1 -->|Base Salary & Grade Allowances| P3
    P3 -->|Write Monthly Payroll| D3
    D3 -->|Payslip View| EMP
    P3 -->|Dispatch Auto-Journal Impact| P4

    %% P4 Flows
    FIN -->|Manual Journal Vouchers| P4
    P4 -->|Write Balanced Lines| D4
    D4 -->|Trial Balance & P&L| FIN
    D4 -->|Ledger Streams| P6

    %% P5 Flows
    FIN -->|Create Customer Invoice & Bills| P5
    P5 -->|Write Invoices & Receipts| D5
    D5 -->|AR/AP Balances| FIN
    P5 -->|Post Billing Journal Entries| P4
    D5 -->|Historical Receivables/Payables| P6

    %% P6 AI Flows
    P6 -->|Store Forecasts & OCR Cache| D6
    D6 -->|Deliver Cash Flow Projections| EXEC
    P6 -->|Auto-filled Expense Suggestions| FIN

    %% Admin & Audit
    ADMIN -->|Config & Permissions| D7
    P1 -.->|Audit Trail| D7
    P3 -.->|Audit Trail| D7
    P4 -.->|Audit Trail| D7
    P5 -.->|Audit Trail| D7
```

### 3.1 Visual Artifact Reference
The primary system decomposition architecture is captured in the archive:
![Figure 2: DFD Level 0](assets/figures/figure2_dfd_level_0.png)

---

## 4. DFD Level 1: Subsystem Process Decompositions

### 4.1 Subsystem 1.0 & 2.0: HR, Attendance & Leave Workflow

This subsystem handles workforce lifecycle events, tracking working hours and enforcing leave policy balances.

```mermaid
flowchart LR
    subgraph "Subsystem 2.0: Time & Absence"
        E["Employee"] -->|Check-in/out Request| P2_1["2.1 Record Punch & Calculate Hours"]
        P2_1 -->|Daily Log| DS_ATT[("D2: Attendance")]
        
        E -->|Submit Leave Form| P2_2["2.2 Validate Leave Entitlement"]
        DS_EMP[("D1: Employees")] -->|Contract & Balance Info| P2_2
        P2_2 -->|Pending Request| P2_3["2.3 Route for HR Approval"]
        HR["HR Manager"] -->|Approve / Reject| P2_3
        P2_3 -->|Update Leave Balance| DS_LEAVE[("D2: Leave Requests")]
        P2_3 -->|Send Decision Alert| E
    end
```

### 4.2 Subsystem 3.0: Payroll Calculation Engine & GL Dispatch

The pivotal enterprise integration point occurs when monthly attendance, overtime, bonuses, statutory taxes, and base salaries are aggregated, locked, and converted into balanced General Ledger journals.

```mermaid
flowchart TD
    subgraph "Subsystem 3.0: End-of-Month Payroll Engine"
        D1[("D1: Employee Salary Data")] -->|Base Pay, Allowances| P3_1["3.1 Aggregate Monthly Timesheet & Overtime"]
        D2[("D2: Attendance & Leave Logs")] -->|Overtime Hours, Unpaid Days| P3_1
        
        P3_1 -->|Gross Pay Components| P3_2["3.2 Compute Egyptian Tax & Social Insurance"]
        P3_2 -->|14% Income Tax Tiers, 11% Employee SI, 18.75% Co. SI| P3_3["3.3 Calculate Final Net Pay"]
        
        P3_3 -->|Draft Payroll Run| P3_4["3.4 Authorize & Lock Period"]
        HRM["HR Director"] -->|Digital Sign-off| P3_4
        
        P3_4 -->|Lock Records| D3[("D3: Payroll History & Payslips")]
        P3_4 -->|Trigger Automated Journal Event| P3_5["3.5 Generate Balanced Journal Voucher"]
        
        P3_5 -->|Debit: 5010 Salaries Expense<br/>Credit: 2020 Accrued Payroll<br/>Credit: 2030 Tax Authority Payable| D4[("D4: General Ledger")]
    end
```

### 4.3 Subsystem 4.0 & 5.0: Invoicing, Payments & General Ledger

```mermaid
flowchart LR
    subgraph "Subsystem 5.0: Invoicing & Cash Lifecycle"
        ACT["Accountant"] -->|Customer Billing Info| P5_1["5.1 Generate Invoice with 14% VAT"]
        P5_1 -->|Store Invoice| D5[("D5: Invoices & Receivables")]
        P5_1 -->|Auto-Post AR Journal| P4_1["4.1 Post Balanced Ledger Entry"]
        
        CUST["Customer"] -->|Remit Bank Payment| P5_2["5.2 Process Receipt & Bank Allocation"]
        P5_2 -->|Mark Invoice Settled| D5
        P5_2 -->|Debit Bank / Credit AR| P4_1
        P4_1 -->|Update Account Balances| D4[("D4: General Ledger")]
    end
```

### 4.4 Subsystem 6.0: AI Intelligence Hub (OCR & Predictive Pipeline)

```mermaid
flowchart TD
    subgraph "Subsystem 6.0: AI Processing Pipeline"
        DOC["Vendor PDF / Image Receipt"] -->|Upload File| P6_1["6.1 Preprocessing & Image Normalization"]
        P6_1 -->|Clean Image Tensors| P6_2["6.2 LayoutLM / Vision OCR Extraction"]
        P6_2 -->|Extracted Text, Table Entities| P6_3["6.3 Entity Disambiguation & Account Mapping"]
        P6_3 -->|Pre-filled Bill Draft (Vendor, Tax ID, Amount)| UI["Finance UI Review"]
        
        D4[("D4: Historical GL Cash Flows")] -->|5-Year Daily Cash Flow Series| P6_4["6.4 Feature Extraction & Fourier Decomposition"]
        D5[("D5: Due Invoices & Bills")] -->|Accounts Receivable & Payable Aging| P6_4
        P6_4 -->|Normalized Vector| P6_5["6.5 Prophet / LSTM Predictive Forecasting Engine"]
        P6_5 -->|30/60/90-Day Liquidity Bands| D6[("D6: AI Predictions")]
        D6 -->|Visual Forecast Horizon| DASH["Executive CFO Dashboard"]
    end
```

---

## 5. Data Flow Dictionary

The Data Flow Dictionary catalogues the precise data structure of critical communication packets traversing system processes:

| Data Flow Name | Source | Destination | Data Attributes / Elements |
|:---|:---|:---|:---|
| `EmployeePunchPacket` | Employee Terminal | Process 2.1 | `EmployeeId`, `Timestamp`, `PunchType` (In/Out), `ClientIp`, `Latitude`, `Longitude` |
| `LeaveApplicationPacket` | Employee UI | Process 2.2 | `EmployeeId`, `LeaveTypeId`, `StartDate`, `EndDate`, `TotalDays`, `ReasonNotes`, `AttachmentUrl` |
| `PayrollCalculationInput` | Process 1.0 & 2.0 | Process 3.1 | `EmployeeId`, `BaseSalary`, `HousingAllowance`, `TransportAllowance`, `ApprovedOvertimeHours`, `UnpaidAbsenceDays` |
| `StatutoryDeductionSummary`| Process 3.2 | Process 3.3 | `EmployeeSocialInsuranceShare`, `EmployerSocialInsuranceShare`, `IncomeTaxWithheld`, `MartyrSupportFund` |
| `AutomatedJournalVoucher` | Process 3.5 | Process 4.1 | `VoucherNumber`, `Date`, `Description`, `Lines: [{AccountId, Debit, Credit, Memo}]` where $\sum Debit == \sum Credit$ |
| `CustomerInvoiceDraft` | Accountant UI | Process 5.1 | `CustomerId`, `IssueDate`, `DueDate`, `Items: [{Description, Quantity, UnitPrice, Discount}]`, `VatRate (0.14)`, `TotalVat`, `GrandTotal` |
| `OcrInferenceResponse` | AI Engine (6.2) | Finance UI | `VendorName`, `TaxRegistrationNumber`, `InvoiceNumber`, `InvoiceDate`, `LineItems: [{Desc, Amount}]`, `ConfidenceScore` |
| `CashForecastPayload` | AI Engine (6.5) | CFO Dashboard | `ForecastHorizonDays (30/60/90)`, `DailyProjections: [{Date, ExpectedInflow, ExpectedOutflow, NetPosition, UpperBound95, LowerBound95}]` |

---
*End of Process Modeling & Data Flow Diagrams Document*
