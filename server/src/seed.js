import bcrypt from 'bcryptjs';
import { db, migrate } from './db.js';

const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin12345';

const sessions = [
  ['Opening and Welcome', 'Kickoff, agenda, and house rules.', 'Event Host', '09:00', '09:30', 'Main Hall', 'open', 1],
  ['Workshop Foundations', 'Core concepts and shared language.', 'Lead Instructor', '09:30', '10:45', 'Main Hall', 'open', 2],
  ['Break', 'Short reset before hands-on work.', '', '10:45', '11:00', 'Lobby', 'open', 3],
  ['Hands-on Session', 'Guided practice with real examples.', 'Lead Instructor', '11:00', '12:30', 'Main Hall', 'open', 4],
  ['Lunch', 'Lunch break.', '', '12:30', '13:30', 'Dining Area', 'open', 5],
  ['Applied Practice', 'Small group work and coaching.', 'Facilitator', '13:30', '15:00', 'Main Hall', 'open', 6],
  ['Wrap-up and Certificate Briefing', 'Closing notes and certificate guidance.', 'Event Host', '15:00', '15:30', 'Main Hall', 'open', 7],
];

export function seed() {
  migrate();

  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
      'Admin User',
      adminEmail,
      bcrypt.hashSync(adminPassword, 10),
      'admin',
    );
  }

  const insertSession = db.prepare(`
    INSERT OR IGNORE INTO sessions
    (title, description, speaker_name, start_time, end_time, location, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const session of sessions) insertSession.run(...session);
}

seed();
