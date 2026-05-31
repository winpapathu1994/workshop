import bcrypt from 'bcryptjs';
import cors from 'cors';
import crypto from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { db, migrate } from './db.js';
import { seed } from './seed.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const CLIENT_URL = process.env.CLIENT_URL || 'http://127.0.0.1:5173';
const WORKSHOP_NAME = process.env.WORKSHOP_NAME || 'Workshop 2026';
const WORKSHOP_DATE = process.env.WORKSHOP_DATE || 'May 28, 2026';
const ORGANIZER_NAME = process.env.ORGANIZER_NAME || 'Workshop Team';

migrate();
seed();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

function signUser(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function auth(req, res, next) {
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const token = headerToken || req.query.token;
  if (!token) return res.status(401).json({ error: { message: 'Authentication required.' } });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: { message: 'User not found.' } });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: { message: 'Invalid or expired token.' } });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Admin access required.' } });
  next();
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isEligible(userId) {
  const row = db.prepare(`
    SELECT r.status AS registrationStatus, a.status AS attendanceStatus
    FROM registrations r
    LEFT JOIN attendance_records a ON a.user_id = r.user_id
    WHERE r.user_id = ?
  `).get(userId);
  return row?.registrationStatus === 'registered' && row?.attendanceStatus === 'attended';
}

function certificateNumber(userId) {
  return `WS-20260528-${String(userId).padStart(5, '0')}`;
}

function getOrCreateCertificate(userId, generatedBy = null) {
  let certificate = db.prepare('SELECT * FROM certificates WHERE user_id = ?').get(userId);
  if (!certificate) {
    db.prepare(`
      INSERT INTO certificates (user_id, certificate_number, generated_at, generated_by_user_id)
      VALUES (?, ?, ?, ?)
    `).run(userId, certificateNumber(userId), new Date().toISOString(), generatedBy);
    certificate = db.prepare('SELECT * FROM certificates WHERE user_id = ?').get(userId);
  }
  return certificate;
}

function sendCertificate(res, userId, generatedBy = null) {
  if (!isEligible(userId)) {
    return res.status(403).json({ error: { message: 'Certificate is not available until attendance is confirmed.' } });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const certificate = getOrCreateCertificate(userId, generatedBy);
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 60 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificate_number}.pdf"`);
  doc.pipe(res);

  doc.rect(30, 30, 782, 535).lineWidth(2).stroke('#186a5b');
  doc.fillColor('#17202a').fontSize(22).text(WORKSHOP_NAME, { align: 'center' });
  doc.moveDown(1.5);
  doc.fontSize(42).text('Certificate of Completion', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(17).fillColor('#475569').text('This certifies that', { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(36).fillColor('#186a5b').text(user.name, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(17).fillColor('#475569').text(`attended and completed ${WORKSHOP_NAME} on ${WORKSHOP_DATE}.`, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(13).text(`Certificate No: ${certificate.certificate_number}`, 90, 440);
  doc.text(`Generated: ${new Date(certificate.generated_at).toLocaleDateString()}`, 90, 462);
  doc.text(ORGANIZER_NAME, 620, 440, { width: 120, align: 'center' });
  doc.moveTo(610, 430).lineTo(760, 430).stroke('#17202a');
  doc.end();
}

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: { message: 'Invalid email or password.' } });
  }
  res.json({ token: signUser(user), user: publicUser(user) });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone, organization, jobTitle } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: { message: 'Name, email, and a 6+ character password are required.' } });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: { message: 'Email is already registered.' } });

  const tx = db.transaction(() => {
    const result = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
      name,
      email,
      bcrypt.hashSync(password, 10),
      'attendee',
    );
    db.prepare('INSERT INTO attendee_profiles (user_id, phone, organization, job_title) VALUES (?, ?, ?, ?)').run(
      result.lastInsertRowid,
      phone || '',
      organization || '',
      jobTitle || '',
    );
    db.prepare('INSERT INTO registrations (user_id, status) VALUES (?, ?)').run(result.lastInsertRowid, 'registered');
    return db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  });
  const user = tx();
  res.status(201).json({ user: publicUser(user), registration: { status: 'registered' } });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));

app.get('/api/sessions', auth, (req, res) => {
  const sessions = db.prepare(`
    SELECT id, title, description, speaker_name AS speakerName, start_time AS startTime,
           end_time AS endTime, location, sort_order AS sortOrder
    FROM sessions ORDER BY sort_order, start_time
  `).all();
  res.json({ sessions });
});

app.get('/api/attendee/me', auth, (req, res) => {
  const row = db.prepare(`
    SELECT u.name, r.status AS registrationStatus, a.status AS attendanceStatus, a.marked_at AS markedAt
    FROM users u
    LEFT JOIN registrations r ON r.user_id = u.id
    LEFT JOIN attendance_records a ON a.user_id = u.id
    WHERE u.id = ?
  `).get(req.user.id);
  res.json({
    ...row,
    attended: row.attendanceStatus === 'attended',
    certificateEligible: isEligible(req.user.id),
  });
});

app.get('/api/admin/dashboard', auth, requireAdmin, (req, res) => {
  const registered = db.prepare("SELECT COUNT(*) AS count FROM registrations WHERE status = 'registered'").get().count;
  const attended = db.prepare("SELECT COUNT(*) AS count FROM attendance_records WHERE status = 'attended'").get().count;
  const sessions = db.prepare('SELECT COUNT(*) AS count FROM sessions').get().count;
  res.json({ registered, attended, eligible: attended, sessions });
});

app.post('/api/admin/sessions', auth, requireAdmin, (req, res) => {
  const { title, description, speakerName, startTime, endTime, location } = req.body;
  if (!title || !startTime || !endTime) return res.status(400).json({ error: { message: 'Title, start time, and end time are required.' } });
  const sortOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM sessions').get().next;
  const result = db.prepare(`
    INSERT INTO sessions (title, description, speaker_name, start_time, end_time, location, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', speakerName || '', startTime, endTime, location || '', sortOrder);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/admin/sessions/:id', auth, requireAdmin, (req, res) => {
  const { title, description, speakerName, startTime, endTime, location, sortOrder } = req.body;
  db.prepare(`
    UPDATE sessions
    SET title = ?, description = ?, speaker_name = ?, start_time = ?, end_time = ?, location = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description || '', speakerName || '', startTime, endTime, location || '', Number(sortOrder) || 0, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/sessions/:id', auth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/registrations', auth, requireAdmin, (req, res) => {
  const registrations = db.prepare(`
    SELECT u.id AS userId, r.id, u.name, u.email, p.organization, r.status,
           CASE WHEN a.status = 'attended' THEN 'yes' ELSE 'no' END AS attended
    FROM registrations r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN attendee_profiles p ON p.user_id = u.id
    LEFT JOIN attendance_records a ON a.user_id = u.id
    ORDER BY r.registered_at DESC
  `).all();
  res.json({ registrations });
});

app.post('/api/admin/attendance/qr-tokens', auth, requireAdmin, async (req, res) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const result = db.prepare('INSERT INTO attendance_qr_tokens (token_hash, created_by_user_id, expires_at) VALUES (?, ?, ?)').run(
    hashToken(rawToken),
    req.user.id,
    expiresAt,
  );
  const attendanceUrl = `${CLIENT_URL}/attendance/confirm?token=${rawToken}`;
  const qrDataUrl = await QRCode.toDataURL(attendanceUrl, { margin: 1, width: 300 });
  res.json({ id: result.lastInsertRowid, attendanceUrl, qrDataUrl, expiresAt });
});

app.post('/api/attendance/confirm', auth, (req, res) => {
  if (req.user.role !== 'attendee') return res.status(403).json({ error: { message: 'Only attendees can self-confirm attendance.' } });
  const token = req.body.token;
  if (!token) return res.status(400).json({ error: { message: 'Attendance token is required.' } });
  const qr = db.prepare('SELECT * FROM attendance_qr_tokens WHERE token_hash = ?').get(hashToken(token));
  if (!qr || qr.revoked_at || new Date(qr.expires_at) < new Date()) {
    return res.status(400).json({ error: { message: 'The attendance QR code is invalid or has expired.' } });
  }
  const registration = db.prepare("SELECT id FROM registrations WHERE user_id = ? AND status = 'registered'").get(req.user.id);
  if (!registration) return res.status(403).json({ error: { message: 'You are not registered for this workshop.' } });
  const existing = db.prepare("SELECT * FROM attendance_records WHERE user_id = ? AND status = 'attended'").get(req.user.id);
  if (existing) return res.json({ status: 'attended', markedAt: existing.marked_at, alreadyAttended: true });

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO attendance_records (user_id, status, method, marked_at, qr_token_id)
    VALUES (?, 'attended', 'qr_self', ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET status = 'attended', method = 'qr_self', marked_at = excluded.marked_at, qr_token_id = excluded.qr_token_id, updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, now, qr.id);
  res.json({ status: 'attended', markedAt: now });
});

app.get('/api/admin/attendance', auth, requireAdmin, (req, res) => {
  const attendance = db.prepare(`
    SELECT u.id AS userId, u.name, u.email, a.status = 'attended' AS attended, a.marked_at AS markedAt, a.method
    FROM users u
    JOIN registrations r ON r.user_id = u.id
    LEFT JOIN attendance_records a ON a.user_id = u.id
    WHERE u.role = 'attendee'
    ORDER BY u.name
  `).all();
  res.json({ attendance: attendance.map((row) => ({ ...row, attended: Boolean(row.attended) })) });
});

app.put('/api/admin/attendance/:userId', auth, requireAdmin, (req, res) => {
  const status = req.body.status === 'revoked' ? 'revoked' : 'attended';
  db.prepare(`
    INSERT INTO attendance_records (user_id, status, method, marked_at, marked_by_user_id, notes)
    VALUES (?, ?, 'admin_manual', ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET status = excluded.status, method = 'admin_manual', marked_at = excluded.marked_at, marked_by_user_id = excluded.marked_by_user_id, notes = excluded.notes, updated_at = CURRENT_TIMESTAMP
  `).run(req.params.userId, status, new Date().toISOString(), req.user.id, req.body.notes || '');
  res.json({ ok: true });
});

app.get('/api/certificates/me/status', auth, (req, res) => {
  res.json({ eligible: isEligible(req.user.id) });
});

app.get('/api/certificates/me/download', auth, (req, res) => sendCertificate(res, req.user.id, null));

app.get('/api/admin/certificates', auth, requireAdmin, (req, res) => {
  const certificates = db.prepare(`
    SELECT u.id AS userId, u.name, u.email, a.status = 'attended' AS eligible, c.certificate_number AS certificateNumber
    FROM users u
    JOIN registrations r ON r.user_id = u.id
    LEFT JOIN attendance_records a ON a.user_id = u.id
    LEFT JOIN certificates c ON c.user_id = u.id
    WHERE u.role = 'attendee'
    ORDER BY u.name
  `).all().map((row) => ({ ...row, eligible: Boolean(row.eligible) }));
  res.json({ certificates });
});

app.get('/api/admin/certificates/:userId/download', auth, requireAdmin, (req, res) => sendCertificate(res, Number(req.params.userId), req.user.id));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error.' } });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`API running on http://127.0.0.1:${PORT}`);
});
