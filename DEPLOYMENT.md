# 🚀 دليل النشر المجاني 100% (Free Deployment Guide)

يشرح هذا الدليل كيفية نشر نظام **Indigo ERP** (الواجهة الأمامية React + الباك إند ASP.NET Core + قاعدة البيانات) مجاناً 100% بدون أي تكاليف.

---

## 🏗️ بنية المشروع (Architecture)

1. **الواجهة الأمامية (Frontend):** React 18 + Vite + TypeScript -> يتم رفعها على **Vercel** مجاناً مع شهادة SSL ونطاق مجاني.
2. **الواجهة الخلفية (Backend API):** ASP.NET Core (.NET 10) -> يتم رفعها على **MonsterASP.NET** أو **Render** عبر Docker.
3. **قاعدة البيانات (Database):** SQL Server -> مجانية 100% عبر **MonsterASP.NET** أو **Azure SQL Free Tier**.

---

## الخطوة 1: رفع المشروع على GitHub

المشروع الآن مهيأ بالكامل ومحفوظ كـ Git Repository محلياً. لربطه بحسابك على GitHub:

1. افتح موقع [GitHub](https://github.com) وسجّل الدخول.
2. اضغط على **New Repository** وأنشئ مستودعاً جديداً (مثلاً: `indigo-erp`).
3. **لا** تفعّل خيارات إضافة README أو .gitignore (المشروع يحتوي عليها بالفعل).
4. في مجلد المشروع في جهازك، افتح نافذة PowerShell واكتب الأوامر التالية (استبدل `YOUR_USERNAME` باسم حسابك):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/indigo-erp.git
git branch -M main
git push -u origin main
```

---

## الخطوة 2: نشر الواجهة الخلفية وقاعدة البيانات مجاناً 100%

### الخيار الأفضل والمجاني: MonsterASP.NET
خدمة **MonsterASP.NET** تقدم استضافة مجانية 100% لـ ASP.NET Core مع قاعدة بيانات **Microsoft SQL Server** حقيقية مجاناً (حتى 1GB):

1. أنشئ حساباً مجانياً على [MonsterASP.NET](https://www.monsterasp.net/).
2. أنشئ موقعاً جديداً (New Website) واختر **.NET 10** أو **.NET Core**.
3. من لوحة التحكم، افتح **Databases** وأنشئ قاعدة بيانات **MS SQL Server** جديدة مجاناً.
4. انسخ **Connection String** الخاصة بقاعدة البيانات.
5. انشر ملفات الـ API:
   - في جهازك، قم ببناء نسخة النشر عبر الأمر:
     ```powershell
     cd backend/src/IndigoERP.API
     dotnet publish -c Release -o ../../../publish/api
     ```
   - ارفع محتويات المجلد `publish/api` عبر الـ File Manager أو WebDeploy في MonsterASP.
6. عيّن متغير البيئة `ConnectionStrings__DefaultConnection` بقيمة Connection String لقاعدة بياناتك.
7. سيقوم التطبيق تلقائياً بتطبيق الـ Migrations وزراعة الحسابات الافتراضية (بما فيها حساب المشاهد `viewer@indigo.co`).

---

### الخيار البديل: Render.com (باستخدام Docker)
إذا كنت تفضل استخدام Docker:
1. تم إنشاء ملف `Dockerfile` مسبقاً في جذر المشروع.
2. سجّل الدخول إلى [Render.com](https://render.com).
3. اختر **New +** -> **Web Service**.
4. اربط مستودع GitHub الخاص بك.
5. اختر **Runtime:** Docker.
6. في قسم Environment Variables، أضف:
   - `ConnectionStrings__DefaultConnection`: رابط قاعدة بيانات SQL Server الخاصة بك.
   - `Jwt__Secret`: أي مفتاح سري عشوائي لا يقل عن 32 حرفاً.
7. اضغط **Deploy Web Service** (الباقة Free).

---

## الخطوة 3: نشر الواجهة الأمامية مجاناً على Vercel

1. سجّل الدخول إلى [Vercel](https://vercel.com/) بحساب GitHub.
2. اضغط على **Add New Project** واختر المستودع `indigo-erp`.
3. في إعدادات المشروع (Project Settings):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. في قسم **Environment Variables**، أضف:
   - `VITE_API_URL`: رابط الباك إند الخاص بك (مثال: `https://your-api.monsterasp.net/api` أو `https://your-backend.onrender.com/api`).
5. اضغط **Deploy**.
6. في خلال ثوانٍ سيكون موقعك يعمل على رابط مثل `https://indigo-erp.vercel.app` مع دعم SPA Routing المجهّز في `vercel.json`!

---

## 👥 حسابات تسجيل الدخول التجريبية (Demo Accounts)

| الحساب | البريد الإلكتروني | كلمة المرور | الصلاحية والوظيفة |
|:---|:---|:---|:---|
| **مدير النظام (Admin)** | `admin@indigo.co` | `Admin@123456` | وصول كامل لجميع الوحدات والإعدادات |
| **مشاهد فقط (Viewer)** | `viewer@indigo.co` | `Viewer@123456` | **مشاهدة فقط لجميع الوحدات بدون تعديل/إضافة** |
| **مدير الموارد البشرية** | `hr@indigo.co` | `Hr@123456` | إدارة الموظفين، الرواتب، الإجازات |
| **المدير المالي** | `finance@indigo.co` | `Finance@123456` | الفواتير، المدفوعات، الموازنات |
| **المحاسب** | `accountant@indigo.co` | `Accountant@123456` | القيود اليومية، الأستاذ العام والتقارير |
