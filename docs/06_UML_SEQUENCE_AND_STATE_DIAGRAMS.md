# ⏱️ Dynamic Behavioral Modeling: Sequence & State Diagrams
## UML Sequence Interactions, State Machines & Workflow Lifecycles
### Comprehensive System Analysis & Design Specification
**Project Repository:** [Saifahmed3993/ERP-System-with-AI](https://github.com/Saifahmed3993/ERP-System-with-AI)  
**Version:** 2.0.0 — Dynamic Behavioral Architecture

---

## Table of Contents
1. [Introduction to Dynamic Behavioral Modeling](#1-introduction-to-dynamic-behavioral-modeling)
2. [Detailed UML Sequence Diagrams](#2-detailed-uml-sequence-diagrams)
   - [2.1 Sequence 1: Authentication & Refresh Token Rotation](#21-sequence-1-authentication--refresh-token-rotation)
   - [2.2 Sequence 2: Attendance Check-In with AI Anomaly Guard](#22-sequence-2-attendance-check-in-with-ai-anomaly-guard)
   - [2.3 Sequence 3: Payroll Finalization & Atomic GL Dispatch](#23-sequence-3-payroll-finalization--atomic-gl-dispatch)
   - [2.4 Sequence 4: Invoicing with 14% VAT & Payment Allocation](#24-sequence-4-invoicing-with-14-vat--payment-allocation)
   - [2.5 Sequence 5: Receipt OCR Extraction & Expense Voucher Drafting](#25-sequence-5-receipt-ocr-extraction--expense-voucher-drafting)
   - [2.6 Sequence 6: Predictive Cash Flow Inference & Delivery](#26-sequence-6-predictive-cash-flow-inference--delivery)
3. [UML State Machine Diagrams](#3-uml-state-machine-diagrams)
   - [3.1 Invoice Financial Lifecycle State Machine](#31-invoice-financial-lifecycle-state-machine)
   - [3.2 Leave Request Approval State Machine](#32-leave-request-approval-state-machine)
   - [3.3 Monthly Payroll Period State Machine](#33-monthly-payroll-period-state-machine)
4. [Activity Diagram: End-of-Month Financial Reconciliation](#4-activity-diagram-end-of-month-financial-reconciliation)

---

## 1. Introduction to Dynamic Behavioral Modeling

While class and entity relationship diagrams capture static system topology, dynamic models capture the temporal behavior, state transitions, and asynchronous messaging that occur during runtime operations.

This document formalizes the behavioral contracts between the **React Presentation Layer**, **ASP.NET Core Application Services**, **Entity Framework Core Database Layer**, and the **AI Intelligence Services**.

---

## 2. Detailed UML Sequence Diagrams

---

### 2.1 Sequence 1: Authentication & Refresh Token Rotation

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Browser)
    participant UI as React Client
    participant AuthCtrl as AuthController
    participant Identity as UserManager / SignInManager
    participant TokenSvc as JwtTokenService
    participant DB as SQL Server (Tokens)

    User->>UI: Submit Email & Password
    UI->>AuthCtrl: POST /api/auth/login {email, password}
    AuthCtrl->>Identity: CheckPasswordSignInAsync(user, password)
    
    alt Password Invalid
        Identity-->>AuthCtrl: SignInResult.Failed
        AuthCtrl-->>UI: 401 Unauthorized ("Invalid credentials")
        UI-->>User: Render Error Alert
    else Password Valid
        Identity-->>AuthCtrl: SignInResult.Success
        AuthCtrl->>TokenSvc: GenerateJwtToken(user, roles, claims)
        TokenSvc-->>AuthCtrl: AccessToken (15m expiry)
        AuthCtrl->>TokenSvc: GenerateRefreshToken()
        TokenSvc->>DB: Save RefreshToken(TokenHash, Expiry=7d, UserId)
        AuthCtrl-->>UI: 200 OK {accessToken, refreshToken, userProfile}
        UI->>UI: Store AccessToken in Memory & Profile in State
        UI-->>User: Redirect to Dashboard
    end

    Note over UI, AuthCtrl: 14 Minutes Later (Sliding Rotation)
    UI->>AuthCtrl: POST /api/auth/refresh {refreshToken}
    AuthCtrl->>DB: Validate & Revoke Old RefreshToken
    AuthCtrl->>TokenSvc: Issue New AccessToken & Rotated RefreshToken
    AuthCtrl-->>UI: 200 OK {newAccessToken, newRefreshToken}
```

---

### 2.2 Sequence 2: Attendance Check-In with AI Anomaly Guard

```mermaid
sequenceDiagram
    autonumber
    actor Emp as Employee
    participant UI as Attendance Page
    participant API as AttendanceController
    participant AI as AI Anomaly Service
    participant DB as SQL Server

    Emp->>UI: Click "Check In"
    UI->>UI: Capture Client Timestamp & Network IP
    UI->>API: POST /api/hr/attendance/check-in {employeeId}
    
    API->>DB: Query Today's Attendance Record
    alt Already Checked In
        DB-->>API: Existing Attendance Record Found
        API-->>UI: 400 Bad Request ("Already checked in for today")
        UI-->>Emp: Display Duplicate Check-in Notice
    else No Check-in Record
        API->>AI: EvaluatePunchTelemetry(empId, timestamp, ip)
        AI->>AI: Execute Isolation Forest Scoring
        AI-->>API: Score = 0.04 (Normal Baseline)
        
        API->>DB: INSERT INTO Attendances (EmployeeId, Date, CheckIn, Status='Present')
        DB-->>API: Attendance Created (Id=Guid)
        API-->>UI: 200 OK {attendanceId, checkInTime: "08:58 AM"}
        UI-->>Emp: Render Green Status Badge ("Checked In")
    end
```

---

### 2.3 Sequence 3: Payroll Finalization & Atomic GL Dispatch

The pivotal architectural sequence illustrating the automated transition from HR compensation approval to General Ledger balance commitment:

```mermaid
sequenceDiagram
    autonumber
    actor HR as HR Director
    participant UI as Payroll Page
    participant PCtrl as PayrollController
    participant PaySvc as PayrollEngineService
    participant TaxEng as EgyptianTaxService
    participant EventBus as In-Memory Event Dispatcher
    participant GLHandler as PostPayrollToGLHandler
    participant DB as SQL Server (Transaction Scope)

    HR->>UI: Click "Approve & Finalize" (Period: 2026-10)
    UI->>PCtrl: POST /api/hr/payroll/approve {period: "2026-10"}
    PCtrl->>PaySvc: FinalizePayrollAsync("2026-10")
    
    PaySvc->>DB: BEGIN TRANSACTION (Serializable)
    PaySvc->>TaxEng: Recompute Egyptian Tax Brackets & SI Ceilings
    TaxEng-->>PaySvc: Confirmed Withholding Figures
    
    PaySvc->>DB: UPDATE Payrolls SET Status='Approved' WHERE Period='2026-10'
    
    PaySvc->>EventBus: PublishAsync(new PayrollFinalizedEvent("2026-10", Totals))
    EventBus->>GLHandler: Handle(PayrollFinalizedEvent)
    
    GLHandler->>GLHandler: Construct Balanced Journal Voucher
    Note right of GLHandler: Debit: 5010 Salaries Exp (Gross)<br/>Debit: 5015 Co. Social Ins (18.75%)<br/>Credit: 2020 Net Salaries Payable<br/>Credit: 2030 Tax Withholding<br/>Credit: 2035 Social Insurance Authority
    GLHandler->>GLHandler: Validate: Sum(Debit) == Sum(Credit)
    
    GLHandler->>DB: INSERT INTO JournalEntries (Voucher='PAY-2026-10', Status='Posted')
    GLHandler->>DB: INSERT INTO JournalLines (Lines: 5 rows)
    
    PaySvc->>DB: COMMIT TRANSACTION
    PaySvc-->>PCtrl: PayrollApprovedResult (VoucherId=Guid)
    PCtrl-->>UI: 200 OK {message: "Payroll locked and posted to General Ledger"}
    UI-->>HR: Show Success Banner & Download Payslips Button
```

---

### 2.4 Sequence 4: Invoicing with 14% VAT & Payment Allocation

```mermaid
sequenceDiagram
    autonumber
    actor Act as Senior Accountant
    participant UI as Invoicing UI
    participant InvCtrl as InvoicesController
    participant TaxSvc as EgyptianTaxEngine
    participant DB as SQL Server
    actor Cust as Customer (Bank)

    Act->>UI: Select Customer, Add Line Items (Subtotal = 100,000 EGP)
    UI->>TaxSvc: CalculateVat(100000, Rate = 0.14)
    TaxSvc-->>UI: VAT = 14,000 EGP, Grand Total = 114,000 EGP
    Act->>UI: Click "Save & Issue Invoice"
    
    UI->>InvCtrl: POST /api/finance/invoices {customerId, items, total: 114000}
    InvCtrl->>DB: INSERT INTO Invoices (Status='Sent', Vat=14000, Total=114000)
    InvCtrl->>DB: Auto-Post AR Journal (Dr: 1030 AR, Cr: 4010 Rev, Cr: 2040 VAT)
    InvCtrl-->>UI: 201 Created {invoiceId, invoiceNumber: "INV-2026-088"}
    UI-->>Act: Display Printable Invoice with ETA QR Code

    Note over Act, Cust: 15 Days Later (Bank Settlement)
    Cust->>Act: Wire Transfer Receipt (114,000 EGP to CIB Bank)
    Act->>UI: Open Invoice -> Click "Record Payment"
    UI->>InvCtrl: POST /api/finance/invoices/INV-2026-088/payments {bankAccount: 1020, amount: 114000}
    InvCtrl->>DB: INSERT INTO Payments (Method='Wire', Amount=114000)
    InvCtrl->>DB: UPDATE Invoices SET Status='Paid', PaidAmount=114000
    InvCtrl->>DB: Post Payment Journal (Dr: 1020 CIB Bank, Cr: 1030 AR)
    InvCtrl-->>UI: 200 OK {status: "Paid"}
    UI-->>Act: Update Row to Green "Paid" Badge
```

---

### 2.5 Sequence 5: Receipt OCR Extraction & Expense Voucher Drafting

```mermaid
sequenceDiagram
    autonumber
    actor Act as Accountant
    participant UI as Expense Entry Page
    participant API as ExpenseController
    participant AI_Gateway as IAiInferenceGateway
    participant Python_OCR as LayoutLM OCR Microservice
    participant DB as SQL Server

    Act->>UI: Drag & Drop Scanned Receipt (telecom_bill.pdf)
    UI->>API: POST /api/finance/expenses/smart-scan (multipart/form-data)
    API->>API: Validate File: MIME=application/pdf, Size < 10MB
    API->>AI_Gateway: ExtractInvoiceDataAsync(fileStream)
    
    AI_Gateway->>Python_OCR: POST /inference/ocr (Binary Stream)
    Python_OCR->>Python_OCR: Normalize Image -> LayoutLMv3 Token Classification
    Python_OCR->>Python_OCR: Match Regex: TaxId="100-245-890", Total=28,500 EGP
    Python_OCR-->>AI_Gateway: JSON {vendor: "Telecom Egypt", taxId: "100-245-890", total: 28500, vat: 3500, confidence: 0.96}
    
    AI_Gateway->>DB: Match Vendor by TaxId -> Returns VendorId
    AI_Gateway->>DB: Match Category -> Suggests Account 5030 (Datacenter & Cloud)
    AI_Gateway-->>API: Enriched Expense Draft DTO
    API-->>UI: 200 OK {prepopulatedForm}
    
    UI-->>Act: Render Side-by-Side Review: PDF Preview vs Form Fields
    Act->>UI: Confirm Accuracy & Click "Save Expense"
    UI->>API: POST /api/finance/expenses {vendorId, accountId: 5030, amount: 28500}
    API->>DB: INSERT INTO Expenses & Save PDF File to Vault
    API-->>UI: 201 Created
```

---

### 2.6 Sequence 6: Predictive Cash Flow Inference & Delivery

```mermaid
sequenceDiagram
    autonumber
    actor CFO as Finance Manager / CFO
    participant UI as Executive Dashboard
    participant API as ReportsController
    participant AI_Svc as CashForecastService
    participant Python_AI as Prophet Inference Engine
    participant DB as SQL Server

    CFO->>UI: Open Cash Flow Forecast (Select 90 Days)
    UI->>API: GET /api/reports/cash-flow-forecast?horizon=90
    API->>AI_Svc: GetProjectedCashFlowAsync(horizonDays: 90)
    
    AI_Svc->>DB: Fetch 36-Month Historical Daily Cash Ledgers (1010, 1020, 1021)
    AI_Svc->>DB: Fetch Unpaid Customer Invoices (Expected Inflow Schedule)
    AI_Svc->>DB: Fetch Unpaid Vendor Bills & Fixed Payroll Schedules
    DB-->>AI_Svc: Historical Series & Confirmed Forward Schedules
    
    AI_Svc->>Python_AI: POST /inference/forecast {historyVector, scheduleOffsets, horizon: 90}
    Python_AI->>Python_AI: Decompose Trend, Seasonality & Egyptian Weekends
    Python_AI->>Python_AI: Generate Daily Projections & 95% Confidence Bounds
    Python_AI-->>AI_Svc: Forecast JSON Array (90 daily data points)
    
    AI_Svc->>DB: Cache Predictions in AiPredictions Table
    AI_Svc-->>API: ForecastResponseDto
    API-->>UI: 200 OK {projections, minThreshold: 500000 EGP, alerts: []}
    UI-->>CFO: Render High-Resolution Interactive Forecast Chart
```

---

## 3. UML State Machine Diagrams

---

### 3.1 Invoice Financial Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft : Create Invoice Draft
    
    Draft --> Sent : Save & Issue (Dispatches AR Journal)
    Draft --> Void : Discard Draft
    
    Sent --> PartiallyPaid : Partial Payment Received
    Sent --> Paid : Full Payment Received
    Sent --> Overdue : DueDate Passed & Balance > 0
    
    PartiallyPaid --> Paid : Remainder Settled
    PartiallyPaid --> Overdue : DueDate Passed & Balance > 0
    
    Overdue --> PartiallyPaid : Partial Payment Collected
    Overdue --> Paid : Full Delinquency Cleared
    Overdue --> BadDebtWriteOff : Uncollectible (Manager Sign-off)
    
    Paid --> [*] : Transaction Settled & Reconciled
    Void --> [*] : Entry Cancelled
    BadDebtWriteOff --> [*] : Written Off to Bad Debt Expense (5090)
```

---

### 3.2 Leave Request Approval State Machine

```mermaid
stateDiagram-v2
    [*] --> Submitted : Employee Submits Request
    
    Submitted --> UnderReview : System Validates Quota & Routes to HR
    Submitted --> AutoRejected : Insufficient Leave Balance
    
    UnderReview --> Approved : HR Manager Approves
    UnderReview --> Rejected : HR Manager Rejects (Requires Reason)
    
    Approved --> BalanceDeducted : System Decrements Annual Quota
    BalanceDeducted --> AttendanceFlagged : System Marks Timesheet 'On Leave'
    
    AttendanceFlagged --> Completed : Leave Period Concludes
    AttendanceFlagged --> Cancelled : Emergency Recall (Balance Restored)
    
    AutoRejected --> [*]
    Rejected --> [*]
    Completed --> [*]
    Cancelled --> [*]
```

---

### 3.3 Monthly Payroll Period State Machine

```mermaid
stateDiagram-v2
    [*] --> Open : Month Initiated
    
    Open --> Calculating : Batch Calculation Triggered
    Calculating --> DraftRun : Gross, Overtime & Taxes Computed
    
    DraftRun --> Open : Adjust Timesheet / Fix Discrepancy
    DraftRun --> Verified : Internal Auditor / HR Specialist Signs Off
    
    Verified --> Approved : HR Director Final Approval
    
    state Approved {
        [*] --> ImmutableLock : Freeze Timesheets
        ImmutableLock --> LedgerPosted : Trigger Auto-Journal Event
        LedgerPosted --> PayslipsPublished : Make Visible to Employees
    }
    
    Approved --> Disbursed : Bank Wire Transfer Executed (CIB/NBE)
    Disbursed --> [*] : Fiscal Period Closed
```

---

## 4. Activity Diagram: End-of-Month Financial Reconciliation

```mermaid
flowchart TD
    Start([Start: Last Working Day of Month]) --> LockHR[Lock Attendance Timesheets]
    LockHR --> RunPayroll[Execute Payroll Engine Calculation]
    RunPayroll --> CheckPayrollDiscrepancy{Any Timesheet Anomalies?}
    
    CheckPayrollDiscrepancy -- Yes --> FixHR[HR Specialist Rectifies Exceptions] --> RunPayroll
    CheckPayrollDiscrepancy -- No --> SignPayroll[HR Director Signs Off Payroll]
    
    SignPayroll --> AutoPostGL[Post Payroll Journal Voucher to General Ledger]
    AutoPostGL --> MatchInvoices[Match Customer Bank Receipts with Invoices]
    MatchInvoices --> ReconcileBank[Import Bank Statement from CIB & NBE]
    
    ReconcileBank --> CheckVariance{Do Bank Books & GL Match?}
    CheckVariance -- No --> CreateAdjEntry[Create Journal Adjustment Entry] --> CheckVariance
    CheckVariance -- Yes --> GenVatSummary[Generate Egyptian 14% VAT Summary]
    
    GenVatSummary --> ClosePeriod[Close Fiscal Period in System]
    ClosePeriod --> GenReports[Produce Balance Sheet, P&L & Cash Forecast]
    GenReports --> End([End: Management Report Package Delivered])
```

---
*End of Dynamic Behavioral Modeling Document*
