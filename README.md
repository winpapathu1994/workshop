# Workshop Management App

A first MVP for running a single-day, single-track workshop event. The app includes attendee registration, JWT authentication, session management, manual session open/close controls, attendee session attendance, QR attendance, and PDF certificates.

The detailed product spec is in [FEATURE_SPEC.md](FEATURE_SPEC.md).

## Tech Stack

- React with Vite
- Express
- SQLite with `better-sqlite3`
- JWT authentication
- PDFKit for certificate PDFs
- QRCode for attendance QR generation

## Current MVP Features

- Admin and attendee roles
- Seeded admin user
- Seeded workshop sessions
- Attendee self-registration and login
- Admin dashboard with registration, attendance, certificate, and session totals
- Session create, edit, delete, and manual open/close toggle
- Attendee schedule with clickable session detail
- Attendee session attendance recording for open sessions
- QR code self-attendance flow
- Admin manual attendance marking and revocation
- Certificate PDF download for eligible attendees

## Requirements

- Node.js 24 or compatible modern Node.js runtime
- npm

## Setup

Install dependencies:

```bash
npm install
```

Seed the local SQLite database:

```bash
npm run seed
```

Run the full development stack:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:4000`

If Vite reports that `5173` is already in use, it will start on the next available port.

## Seeded Login

Admin account:

```text
Email: admin@example.com
Password: admin12345
```

Attendees can be created from the registration screen.

## Useful Scripts

```bash
npm run dev
npm run server:dev
npm run client:dev
npm run build
npm run start
npm run seed
```

## Environment Variables

The app works with local defaults, but these variables can be configured:

```text
PORT=4000
JWT_SECRET=dev-secret-change-me
CLIENT_URL=http://127.0.0.1:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin12345
WORKSHOP_NAME=Workshop 2026
WORKSHOP_DATE=May 28, 2026
ORGANIZER_NAME=Workshop Team
```

## Data Storage

The application stores runtime data in:

```text
server/data/workshop.sqlite
```

The database schema is created automatically on server startup through `server/src/db.js`. Seed data is inserted idempotently through `server/src/seed.js`.

## App Flow

Admin flow:

1. Sign in with the seeded admin account.
2. Review dashboard totals.
3. Manage sessions from the Sessions tab.
4. Open or close sessions manually.
5. Generate QR attendance from the Attendance tab.
6. Review registrations, attendance, and certificates.

Attendee flow:

1. Register a new attendee account.
2. Sign in as the attendee.
3. Open the schedule.
4. Press a session to view detail.
5. Record attendance when the session is open.
6. Download a certificate after attendance eligibility is met.

## API Summary

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Sessions:

- `GET /api/sessions`
- `GET /api/sessions/:id`
- `POST /api/sessions/:id/attendance`
- `POST /api/admin/sessions`
- `PUT /api/admin/sessions/:id`
- `PATCH /api/admin/sessions/:id/status`
- `DELETE /api/admin/sessions/:id`

Admin:

- `GET /api/admin/dashboard`
- `GET /api/admin/registrations`
- `POST /api/admin/attendance/qr-tokens`
- `GET /api/admin/attendance`
- `PUT /api/admin/attendance/:userId`
- `GET /api/admin/certificates`
- `GET /api/admin/certificates/:userId/download`

Certificates:

- `GET /api/certificates/me/status`
- `GET /api/certificates/me/download`

QR attendance:

- `POST /api/attendance/confirm`

## Certificate Eligibility

An attendee can download a certificate after:

- The attendee is registered.
- Attendance has been confirmed through QR attendance, admin manual attendance, or session attendance.

## Notes

- This is an MVP for one active workshop event.
- Session attendance is currently attendee self-service and requires the session status to be `open`.
- Event-level attendance is still maintained so certificate eligibility and admin attendance views continue to work.
- Multi-day events, multi-track scheduling, payment, email, and public certificate verification are outside the current implementation.

