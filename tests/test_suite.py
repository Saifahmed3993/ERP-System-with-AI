import urllib.request
import json
import sys

def test_api():
    def req(url, method='GET', data=None, token=None):
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        payload = json.dumps(data).encode('utf-8') if data else None
        r = urllib.request.Request(url, data=payload, headers=headers, method=method)
        with urllib.request.urlopen(r) as resp:
            body = resp.read().decode('utf-8')
            return resp.status, json.loads(body) if body else None

    print("=== STARTING FULL SUITE API TESTS ===")

    # 1. Auth Login
    status, auth = req('http://localhost:5250/api/auth/login', 'POST', {'email': 'admin@indigo.co', 'password': 'Admin@123456'})
    assert status == 200, "Login failed"
    token = auth['accessToken']
    print(f"[PASS] 1. Auth Login OK - User: {auth['user']['fullName']}")

    # 2. Reports Endpoints
    reports = ['trial-balance', 'income-statement', 'balance-sheet', 'payroll-summary', 'hr-summary']
    for rep in reports:
        status, data = req(f'http://localhost:5250/api/reports/{rep}', token=token)
        assert status == 200, f"Report {rep} failed"
        print(f"[PASS] 2. Report '{rep}' generated OK")

    # 3. Roles & Permissions
    status, roles = req('http://localhost:5250/api/admin/roles', token=token)
    assert status == 200 and len(roles) > 0, "Roles failed"
    print(f"[PASS] 3. Admin Roles OK - Total Roles: {len(roles)}")

    status, perms = req('http://localhost:5250/api/admin/permissions', token=token)
    assert status == 200 and perms['total'] > 0, "Perms failed"
    print(f"[PASS] 3. Admin Permissions OK - Total Permissions: {perms['total']}")

    # 4. Settings
    status, settings = req('http://localhost:5250/api/admin/settings', token=token)
    assert status == 200, "Settings failed"
    print(f"[PASS] 4. Admin Settings OK - Company: {settings['company']['name']}")

    # 5. Tax Rates
    status, taxes = req('http://localhost:5250/api/finance/tax', token=token)
    assert status == 200 and len(taxes) > 0, "Tax failed"
    print(f"[PASS] 5. Finance Tax Rates OK - Total Rules: {len(taxes)}")

    # 6. Audit Logs
    status, logs = req('http://localhost:5250/api/audit-logs', token=token)
    assert status == 200, "Audit logs failed"
    print(f"[PASS] 6. Audit Logs OK - Log Count: {len(logs['items'])}")

    # 7. Payroll Periods & Payslips
    status, periods = req('http://localhost:5250/api/payroll/periods', token=token)
    assert status == 200, "Payroll periods failed"
    p_items = periods.get('items', periods)
    print(f"[PASS] 7. Payroll Periods OK - Count: {len(p_items)}")
    if p_items:
        period_id = p_items[0]['id']
        status, payrolls = req(f'http://localhost:5250/api/payroll/periods/{period_id}/payrolls', token=token)
        assert status == 200, "Period payrolls failed"
        print(f"[PASS] 7. Period Employee Payrolls OK - Employee Records: {len(payrolls)}")

    print("\n>>> ALL BACKEND API TESTS COMPLETED AND VERIFIED 100% SUCCESSFUL! <<<")

if __name__ == '__main__':
    test_api()
