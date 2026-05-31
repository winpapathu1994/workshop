# Workshop Management App Feature Spec

## 1. Overview

The Workshop Management App is a web application for managing a single-day, single-track workshop event. It supports two user roles: Admin and Attendee. Admins manage sessions, registrations, attendance records, and certificate eligibility. Attendees register for the event, view the event schedule, mark their own attendance using a QR code, and download a PDF certificate after meeting attendance requirements.

The initial product scope is intentionally focused on one event day and one session track. The system should be simple to operate, easy to seed for demos, and structured so future multi-day or multi-track support can be added later without rewriting the core model.

## 2. Tech Stack

- Frontend: React with Vite
- Backend: Express
- Database: SQLite
- Authentication: JWT-based auth
- Certificate generation: Server-generated PDF
- QR code attendance: Admin displays or shares a QR code; attendees scan it and confirm attendance from their own device

## 3. User Roles

### 3.1 Admin

Admins are trusted event operators. They can access all administrative features.

Admin capabilities:

- Sign in using seeded admin credentials.
- View dashboard summary.
- Create, update, delete, and reorder sessions.
- View attendee registrations.
- Manually update registration status if needed.
- View attendance records.
- Manually mark or revoke attendance if needed.
- Generate or view QR attendance links.
- Configure certificate eligibility rules.
- View certificate status per attendee.
- Download or regenerate attendee certificates.

### 3.2 Attendee

Attendees are workshop participants.

Attendee capabilities:

- Register for the workshop.
- Sign in after registration.
- View personal profile and registration status.
- View the workshop schedule.
- Mark self-attendance by scanning a QR code.
- View attendance status.
- Download certificate when eligible.

## 4. Core Assumptions

- The event is single-day and single-track.
- Each session happens sequentially; no overlapping sessions are expected.
- There is one active workshop event in the app.
- Admin user is created by seed data.
- Initial sessions are created by seed data.
- Attendees can self-register unless registration is closed by configuration.
- Attendance is event-level by default, not per-session, unless later extended.
- Certificate eligibility is based on confirmed attendance and registration status.

## 5. Primary User Flows

### 5.1 Admin Sign In

1. Admin opens the app.
2. Admin enters email and password.
3. Backend validates credentials.
4. Backend returns a JWT.
5. Frontend stores the token securely in application state and persists it according to the chosen auth strategy.
6. Admin is redirected to the admin dashboard.

Expected result:

- Admin can access protected admin routes.
- Non-admin users cannot access admin routes.

### 5.2 Attendee Registration

1. Attendee opens the registration page.
2. Attendee enters required profile information.
3. Attendee submits the form.
4. Backend validates input and prevents duplicate registration by email.
5. Backend creates an attendee user and registration record.
6. Backend returns success response.
7. Attendee can sign in and view their event status.

Required registration fields:

- Full name
- Email
- Password
- Phone number, optional
- Organization, optional
- Job title or role, optional

Expected result:

- Attendee has an account.
- Registration status defaults to `registered`.
- Attendee is not marked attended until QR attendance succeeds or admin manually marks attendance.

### 5.3 Session Management

1. Admin opens session management.
2. Admin views all sessions in event order.
3. Admin can add, edit, delete, and reorder sessions.
4. Backend validates session timing and required fields.
5. Updated schedule appears to admins and attendees.

Required session fields:

- Title
- Description, optional
- Speaker name, optional
- Start time
- End time
- Location, optional
- Sort order

Expected result:

- Attendees see the current single-track schedule.
- Sessions are ordered by start time or explicit sort order.

### 5.4 QR Code Self-Attendance

1. Admin opens the attendance QR page.
2. System displays a QR code containing a signed attendance URL or token.
3. Attendee scans the QR code using their device.
4. If not signed in, attendee is prompted to sign in.
5. After sign-in, frontend sends the attendance token to the backend.
6. Backend validates the token.
7. Backend confirms the attendee is registered.
8. Backend records attendance if not already recorded.
9. Attendee sees attendance confirmation.

Expected result:

- An attendee can only mark their own attendance.
- Duplicate scans do not create duplicate attendance records.
- Expired or invalid QR tokens are rejected.
- Attendance record includes timestamp, attendee id, and attendance method.

Attendance methods:

- `qr_self`
- `admin_manual`

### 5.5 Manual Attendance Management

1. Admin opens attendance management.
2. Admin searches or filters attendees.
3. Admin marks an attendee as attended or not attended.
4. Backend records the change and the admin who performed it.

Expected result:

- Admin can correct attendance issues.
- Manual changes are auditable.

### 5.6 Certificate Download

1. Attendee opens certificate page.
2. System checks certificate eligibility.
3. If eligible, attendee can download a PDF certificate.
4. Backend generates or retrieves the certificate PDF.
5. PDF is returned as a downloadable file.

Eligibility rules for initial version:

- Attendee registration status is `registered`.
- Attendee has confirmed attendance.

Expected result:

- Ineligible attendees see a clear status explaining what is missing.
- Eligible attendees receive a personalized PDF certificate.
- Admins can download certificates for attendees from the admin interface.

## 6. Pages and Screens

### 6.1 Public Pages

#### Registration Page

Purpose:

- Allow new attendees to register.

Key UI elements:

- Registration form
- Submit button
- Link to sign in
- Success and error states

#### Sign In Page

Purpose:

- Authenticate admins and attendees.

Key UI elements:

- Email input
- Password input
- Submit button
- Error state for invalid credentials

### 6.2 Attendee Pages

#### Attendee Dashboard

Purpose:

- Show attendee registration, attendance, and certificate status.

Key information:

- Full name
- Registration status
- Attendance status
- Certificate eligibility
- Next available action

#### Schedule Page

Purpose:

- Show the single-day, single-track event schedule.

Key information:

- Session title
- Speaker
- Time
- Description
- Location

#### Attendance Confirmation Page

Purpose:

- Complete QR-based attendance.

States:

- Token validating
- Sign-in required
- Attendance recorded
- Already attended
- Invalid token
- Expired token
- Not registered

#### Certificate Page

Purpose:

- Let eligible attendees download a certificate.

States:

- Eligible and ready to download
- Not attended
- Registration not valid
- Certificate generation error

### 6.3 Admin Pages

#### Admin Dashboard

Purpose:

- Provide quick operational overview.

Metrics:

- Total registered attendees
- Total attended attendees
- Attendance percentage
- Certificate-eligible attendees
- Total sessions

#### Session Management Page

Purpose:

- Manage seeded and newly created sessions.

Features:

- Session list
- Add session
- Edit session
- Delete session
- Reorder sessions

#### Registration Management Page

Purpose:

- View and manage attendees.

Features:

- Search by name or email
- Filter by registration status
- View attendee detail
- Update registration status

#### Attendance Management Page

Purpose:

- View and correct attendance.

Features:

- Search attendees
- Filter attended or not attended
- Mark attended
- Revoke attendance
- View attendance timestamp and method

#### QR Attendance Page

Purpose:

- Display attendance QR code for attendees to scan.

Features:

- Generate current QR code
- Show expiry status
- Refresh QR code
- Copy attendance URL

#### Certificate Management Page

Purpose:

- Review certificate eligibility and download certificates.

Features:

- List attendees with certificate status
- Filter eligible or ineligible
- Download individual certificate
- Regenerate certificate

## 7. Data Model

The following schema describes the intended SQLite entities. Exact column names may be adjusted during implementation, but the core relationships should remain.

### 7.1 Users

Stores authentication and role information.

Fields:

- `id`: primary key
- `name`: text, required
- `email`: text, required, unique
- `password_hash`: text, required
- `role`: text enum, `admin` or `attendee`
- `created_at`: datetime
- `updated_at`: datetime

### 7.2 Attendee Profiles

Stores attendee-specific profile information.

Fields:

- `id`: primary key
- `user_id`: foreign key to users, unique
- `phone`: text, optional
- `organization`: text, optional
- `job_title`: text, optional
- `created_at`: datetime
- `updated_at`: datetime

### 7.3 Sessions

Stores single-track workshop sessions.

Fields:

- `id`: primary key
- `title`: text, required
- `description`: text, optional
- `speaker_name`: text, optional
- `start_time`: datetime or time string, required
- `end_time`: datetime or time string, required
- `location`: text, optional
- `sort_order`: integer, required
- `created_at`: datetime
- `updated_at`: datetime

### 7.4 Registrations

Stores attendee registration state.

Fields:

- `id`: primary key
- `user_id`: foreign key to users, unique
- `status`: text enum, `registered`, `cancelled`
- `registered_at`: datetime
- `updated_at`: datetime

### 7.5 Attendance Records

Stores event-level attendance.

Fields:

- `id`: primary key
- `user_id`: foreign key to users, unique
- `status`: text enum, `attended`, `revoked`
- `method`: text enum, `qr_self` or `admin_manual`
- `marked_at`: datetime
- `marked_by_user_id`: foreign key to users, nullable
- `qr_token_id`: foreign key to attendance QR tokens, nullable
- `notes`: text, optional
- `created_at`: datetime
- `updated_at`: datetime

### 7.6 Attendance QR Tokens

Stores generated QR attendance tokens.

Fields:

- `id`: primary key
- `token_hash`: text, required, unique
- `created_by_user_id`: foreign key to users
- `expires_at`: datetime, required
- `revoked_at`: datetime, nullable
- `created_at`: datetime

Notes:

- Raw QR tokens should not be stored directly.
- Store only a hash of the token.
- Tokens should expire to reduce misuse.

### 7.7 Certificates

Stores generated certificate metadata.

Fields:

- `id`: primary key
- `user_id`: foreign key to users, unique
- `certificate_number`: text, required, unique
- `file_path`: text, optional
- `generated_at`: datetime
- `generated_by_user_id`: foreign key to users, nullable
- `created_at`: datetime
- `updated_at`: datetime

## 8. Authentication and Authorization

### 8.1 JWT Authentication

The backend issues JWTs after successful sign-in.

JWT payload should include:

- `sub`: user id
- `role`: user role
- `email`: user email
- `iat`: issued at
- `exp`: expiration time

Recommended token lifetime:

- Access token: 8 to 24 hours for this simple internal event app

### 8.2 Route Protection

Protected route groups:

- Admin routes require `role = admin`.
- Attendee routes require authenticated user.
- Certificate download requires authenticated user and authorization check.
- Attendance QR confirmation requires authenticated attendee.

### 8.3 Authorization Rules

- Admin can view and manage all data.
- Attendee can view only their own profile, registration, attendance, and certificate.
- Attendee cannot manually alter attendance records.
- Attendee cannot access other attendees' certificates.

## 9. API Specification

Endpoint names are proposed for implementation planning.

### 9.1 Auth

#### `POST /api/auth/login`

Purpose:

- Sign in admin or attendee.

Request:

```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

Response:

```json
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

#### `POST /api/auth/register`

Purpose:

- Register a new attendee.

Request:

```json
{
  "name": "Attendee One",
  "email": "attendee@example.com",
  "password": "password",
  "phone": "09123456789",
  "organization": "Example Org",
  "jobTitle": "Developer"
}
```

Response:

```json
{
  "user": {
    "id": 2,
    "name": "Attendee One",
    "email": "attendee@example.com",
    "role": "attendee"
  },
  "registration": {
    "status": "registered"
  }
}
```

#### `GET /api/auth/me`

Purpose:

- Return the current authenticated user.

### 9.2 Sessions

#### `GET /api/sessions`

Purpose:

- Return public schedule.

Access:

- Authenticated users, or public if schedule should be visible before sign-in.

#### `POST /api/admin/sessions`

Purpose:

- Create a session.

Access:

- Admin only.

#### `PUT /api/admin/sessions/:id`

Purpose:

- Update a session.

Access:

- Admin only.

#### `DELETE /api/admin/sessions/:id`

Purpose:

- Delete a session.

Access:

- Admin only.

#### `PUT /api/admin/sessions/reorder`

Purpose:

- Update session order.

Access:

- Admin only.

### 9.3 Registrations

#### `GET /api/admin/registrations`

Purpose:

- List attendee registrations.

Access:

- Admin only.

#### `GET /api/admin/registrations/:id`

Purpose:

- View registration detail.

Access:

- Admin only.

#### `PUT /api/admin/registrations/:id/status`

Purpose:

- Update registration status.

Access:

- Admin only.

### 9.4 Attendance

#### `POST /api/admin/attendance/qr-tokens`

Purpose:

- Generate a new attendance QR token.

Access:

- Admin only.

Response:

```json
{
  "attendanceUrl": "https://app.example.com/attendance/confirm?token=raw-token",
  "expiresAt": "2026-05-28T10:00:00.000Z"
}
```

#### `POST /api/attendance/confirm`

Purpose:

- Confirm self-attendance using a QR token.

Access:

- Authenticated attendee.

Request:

```json
{
  "token": "raw-token"
}
```

Response:

```json
{
  "status": "attended",
  "markedAt": "2026-05-28T09:45:00.000Z"
}
```

#### `GET /api/admin/attendance`

Purpose:

- List attendance records.

Access:

- Admin only.

#### `PUT /api/admin/attendance/:userId`

Purpose:

- Manually update attendance for an attendee.

Access:

- Admin only.

Request:

```json
{
  "status": "attended",
  "notes": "Checked in at desk"
}
```

### 9.5 Certificates

#### `GET /api/certificates/me/status`

Purpose:

- Return current attendee certificate eligibility.

Access:

- Authenticated attendee.

#### `GET /api/certificates/me/download`

Purpose:

- Download current attendee certificate PDF.

Access:

- Authenticated attendee, eligible only.

#### `GET /api/admin/certificates`

Purpose:

- List certificate statuses for attendees.

Access:

- Admin only.

#### `GET /api/admin/certificates/:userId/download`

Purpose:

- Download a certificate for an attendee.

Access:

- Admin only.

#### `POST /api/admin/certificates/:userId/regenerate`

Purpose:

- Regenerate a certificate for an attendee.

Access:

- Admin only.

## 10. QR Attendance Rules

### 10.1 Token Generation

- Admin can generate an attendance QR token.
- Token should be cryptographically random.
- Token should be stored as a hash in the database.
- Raw token appears only in the generated QR URL.
- QR URL should point to the frontend attendance confirmation route.

Recommended expiry:

- 15 to 60 minutes.

### 10.2 Token Validation

Backend must reject tokens when:

- Token does not exist.
- Token hash does not match.
- Token is expired.
- Token is revoked.
- User is not authenticated.
- User is not an attendee.
- User is not registered.

### 10.3 Duplicate Attendance

If an attendee already has an active attendance record:

- Do not create a new record.
- Return a successful `already_attended` style response.
- Preserve the original attendance timestamp unless admin manually changes it.

## 11. Certificate PDF Requirements

### 11.1 Certificate Content

The PDF certificate should include:

- Event or workshop name
- Attendee full name
- Completion statement
- Event date
- Certificate number
- Generated date
- Organizer name or signature placeholder

Example certificate statement:

```text
This certifies that [Attendee Name] attended and completed [Workshop Name] on [Event Date].
```

### 11.2 Certificate Number

Certificate numbers should be unique and deterministic enough for tracking.

Suggested format:

```text
WS-[YYYYMMDD]-[USER_ID_PADDED]
```

Example:

```text
WS-20260528-00023
```

### 11.3 Generation Behavior

- Generate certificate on first eligible download, or admin-triggered generation.
- Store certificate metadata.
- PDF file may be regenerated if profile or event details change.
- Do not allow certificate download for ineligible attendees.

## 12. Seed Data

The app should provide a seed command or startup seed behavior for local development.

### 12.1 Seed Admin

Seeded admin:

- Name: Admin User
- Email: admin@example.com
- Password: change-me-admin-password
- Role: admin

Implementation note:

- The password must be hashed in the database.
- The plaintext seed password should be configurable by environment variable when possible.

### 12.2 Seed Sessions

Example single-day schedule:

1. Opening and Welcome
   - Time: 09:00 - 09:30
   - Speaker: Event Host

2. Workshop Foundations
   - Time: 09:30 - 10:45
   - Speaker: Lead Instructor

3. Break
   - Time: 10:45 - 11:00

4. Hands-on Session
   - Time: 11:00 - 12:30
   - Speaker: Lead Instructor

5. Lunch
   - Time: 12:30 - 13:30

6. Applied Practice
   - Time: 13:30 - 15:00
   - Speaker: Facilitator

7. Wrap-up and Certificate Briefing
   - Time: 15:00 - 15:30
   - Speaker: Event Host

Seed behavior:

- Running seed multiple times should not create duplicate admin users.
- Running seed multiple times should not duplicate sessions if seeded session identifiers or titles already exist.

## 13. Validation Rules

### 13.1 Registration

- Name is required.
- Email is required and must be valid format.
- Email must be unique.
- Password is required and must meet minimum length.
- Phone is optional.
- Organization is optional.
- Job title is optional.

### 13.2 Sessions

- Title is required.
- Start time is required.
- End time is required.
- End time must be after start time.
- Sort order must be numeric.
- For the first version, overlapping sessions should be rejected or warned because the event is single-track.

### 13.3 Attendance

- User must be registered.
- Only attendees can self-mark attendance.
- Admins can manually mark attendance for attendees.
- QR token must be valid and unexpired.

### 13.4 Certificates

- User must be registered.
- User must have active attendance.
- Certificate number must be unique.

## 14. Error Handling

Errors should be returned in a consistent JSON format.

Example:

```json
{
  "error": {
    "code": "INVALID_QR_TOKEN",
    "message": "The attendance QR code is invalid or has expired."
  }
}
```

Common error codes:

- `INVALID_CREDENTIALS`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `EMAIL_ALREADY_REGISTERED`
- `SESSION_NOT_FOUND`
- `REGISTRATION_NOT_FOUND`
- `INVALID_QR_TOKEN`
- `QR_TOKEN_EXPIRED`
- `NOT_REGISTERED`
- `CERTIFICATE_NOT_ELIGIBLE`
- `INTERNAL_ERROR`

## 15. Security Requirements

- Passwords must be hashed with a secure password hashing algorithm.
- JWT secret must come from environment configuration.
- Attendance QR raw tokens must not be stored in plaintext.
- Admin-only endpoints must verify role on the backend.
- Attendee data access must be scoped to the authenticated user.
- Certificate downloads must be authorization-checked.
- Input validation must be performed server-side.
- SQLite queries should use parameterized statements.
- CORS should be configured for the frontend origin.

## 16. Environment Configuration

Expected environment variables:

- `PORT`: Express server port
- `DATABASE_URL` or `SQLITE_DB_PATH`: SQLite database file path
- `JWT_SECRET`: secret used to sign JWTs
- `JWT_EXPIRES_IN`: token lifetime
- `CLIENT_URL`: frontend app URL
- `ADMIN_EMAIL`: seeded admin email
- `ADMIN_PASSWORD`: seeded admin password
- `WORKSHOP_NAME`: display name for event and certificates
- `WORKSHOP_DATE`: event date
- `ORGANIZER_NAME`: certificate organizer label

## 17. Non-Functional Requirements

### 17.1 Usability

- Admin screens should prioritize fast scanning and operational clarity.
- Attendee screens should provide simple status and next action.
- QR attendance flow should work well on mobile devices.

### 17.2 Reliability

- Duplicate registration and duplicate attendance should be prevented.
- Seed command should be idempotent.
- Certificate generation should fail gracefully and not create duplicate metadata.

### 17.3 Performance

- SQLite is sufficient for the initial single-event scope.
- Admin list endpoints should support search and filtering.
- Basic pagination can be added if attendee count grows.

### 17.4 Accessibility

- Forms should have labels and validation messages.
- Buttons and links should be keyboard accessible.
- Status indicators should not rely only on color.
- PDF download actions should have clear text labels.

## 18. Suggested Frontend Route Map

Public:

- `/login`
- `/register`

Attendee:

- `/app`
- `/app/schedule`
- `/attendance/confirm?token=...`
- `/app/certificate`

Admin:

- `/admin`
- `/admin/sessions`
- `/admin/registrations`
- `/admin/attendance`
- `/admin/attendance/qr`
- `/admin/certificates`

## 19. Suggested Backend Folder Structure

This is a planning suggestion, not an implementation requirement.

```text
server/
  src/
    app.js
    db/
      connection.js
      migrations/
      seed.js
    middleware/
      auth.js
      requireRole.js
      errorHandler.js
    modules/
      auth/
      sessions/
      registrations/
      attendance/
      certificates/
    utils/
      password.js
      jwt.js
      qrTokens.js
      pdf.js

client/
  src/
    main.jsx
    App.jsx
    api/
    auth/
    pages/
    components/
```

## 20. Acceptance Criteria

### 20.1 Authentication

- Admin can sign in with seeded credentials.
- Attendee can register and sign in.
- Invalid credentials are rejected.
- Admin-only routes reject attendee users.

### 20.2 Sessions

- Seeded sessions appear in the schedule.
- Admin can create, edit, delete, and reorder sessions.
- Attendees can view the updated schedule.

### 20.3 Registration

- New attendees can register.
- Duplicate emails are rejected.
- Admin can view registered attendees.

### 20.4 Attendance

- Admin can generate a QR attendance code.
- Attendee can scan QR code and mark attendance.
- Duplicate scans do not duplicate records.
- Expired QR codes are rejected.
- Admin can manually mark and revoke attendance.

### 20.5 Certificates

- Attendee without attendance cannot download certificate.
- Attendee with confirmed attendance can download certificate PDF.
- Certificate includes attendee name, event name, date, and certificate number.
- Admin can download or regenerate attendee certificates.

### 20.6 Seed Data

- Seed creates admin user.
- Seed creates default sessions.
- Seed is safe to run multiple times.

## 21. Out of Scope for Initial Version

- Multi-day events
- Multi-track scheduling
- Payment processing
- Email notifications
- Waitlists
- Badge printing
- Per-session attendance
- Public certificate verification page
- Bulk certificate export
- Advanced analytics

## 22. Future Enhancements

- Multi-day event support
- Multiple rooms or tracks
- Per-session QR attendance
- Email confirmation after registration
- Email certificate delivery
- Certificate verification URL
- CSV import and export
- Bulk attendee upload
- Admin audit log
- Role-based permissions beyond admin and attendee
- Configurable certificate templates

