import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  LogOut,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  UserPlus,
  Users,
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api';

function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${API_URL}${path}`, { ...options, headers }).then(async (response) => {
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Request failed');
      return data;
    }
    if (!response.ok) throw new Error('Request failed');
    return response;
  });
}

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(Boolean(localStorage.getItem('token')));
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    apiRequest('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoadingUser(false));
  }, []);

  const route = window.location.pathname;

  function handleLogin(token, nextUser) {
    localStorage.setItem('token', token);
    setUser(nextUser);
    window.history.replaceState(null, '', nextUser.role === 'admin' ? '/admin' : '/app');
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    window.history.replaceState(null, '', '/login');
  }

  if (loadingUser) return <Shell><StatusCard title="Loading" text="Restoring your session..." /></Shell>;

  if (!user) {
    return (
      <Shell>
        <AuthScreen mode={authMode} setMode={setAuthMode} onLogin={handleLogin} />
      </Shell>
    );
  }

  if (route.startsWith('/attendance/confirm')) {
    return (
      <Shell user={user} onLogout={logout}>
        <AttendanceConfirm user={user} />
      </Shell>
    );
  }

  return (
    <Shell user={user} onLogout={logout}>
      {user.role === 'admin' ? <AdminApp /> : <AttendeeApp />}
    </Shell>
  );
}

function Shell({ children, user, onLogout }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <ShieldCheck size={26} />
          <div>
            <strong>Workshop Manager</strong>
            <span>Single-day event ops</span>
          </div>
        </div>
        {user && (
          <div className="user-chip">
            <span>{user.name}</span>
            <small>{user.role}</small>
            <button className="icon-button" onClick={onLogout} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}

function AuthScreen({ mode, setMode, onLogin }) {
  const [form, setForm] = useState({
    name: '',
    email: mode === 'login' ? 'admin@example.com' : '',
    password: mode === 'login' ? 'admin12345' : '',
    phone: '',
    organization: '',
    jobTitle: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError('');
    setForm((current) => ({
      ...current,
      email: mode === 'login' ? 'admin@example.com' : current.email,
      password: mode === 'login' ? 'admin12345' : current.password,
    }));
  }, [mode]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') {
        await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      }
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-layout">
      <div className="intro-panel">
        <h1>Run registration, attendance, and certificates from one quiet console.</h1>
        <p>Seeded admin: admin@example.com / admin12345</p>
        <div className="metric-row">
          <Metric icon={CalendarDays} label="Track" value="Single" />
          <Metric icon={QrCode} label="Check-in" value="QR" />
          <Metric icon={Award} label="Certificate" value="PDF" />
        </div>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>
        {mode === 'register' && <TextInput label="Full name" value={form.name} onChange={(name) => setForm({ ...form, name })} />}
        <TextInput label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <TextInput label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
        {mode === 'register' && (
          <>
            <TextInput label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
            <TextInput label="Organization" value={form.organization} onChange={(organization) => setForm({ ...form, organization })} />
            <TextInput label="Job title" value={form.jobTitle} onChange={(jobTitle) => setForm({ ...form, jobTitle })} />
          </>
        )}
        {error && <div className="error">{error}</div>}
        <button className="primary-button" disabled={busy}>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </section>
  );
}

function TextInput({ label, value, onChange, type = 'text' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={['Full name', 'Email', 'Password'].includes(label)} />
    </label>
  );
}

function AdminApp() {
  const [tab, setTab] = useState('dashboard');
  const tabs = [
    ['dashboard', 'Dashboard', ClipboardCheck],
    ['sessions', 'Sessions', CalendarDays],
    ['registrations', 'Registrations', Users],
    ['attendance', 'Attendance', QrCode],
    ['certificates', 'Certificates', Award],
  ];

  return (
    <div className="workspace">
      <nav className="side-nav">
        {tabs.map(([id, label, Icon]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      <section className="panel">
        {tab === 'dashboard' && <AdminDashboard />}
        {tab === 'sessions' && <SessionManager />}
        {tab === 'registrations' && <RegistrationManager />}
        {tab === 'attendance' && <AttendanceManager />}
        {tab === 'certificates' && <CertificateManager />}
      </section>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    apiRequest('/admin/dashboard').then(setStats);
  }, []);
  if (!stats) return <StatusCard title="Loading" text="Gathering event numbers..." />;
  return (
    <>
      <SectionHeader title="Admin Dashboard" subtitle="Live view of the workshop day." />
      <div className="metric-grid">
        <Metric icon={Users} label="Registered" value={stats.registered} />
        <Metric icon={CheckCircle2} label="Attended" value={stats.attended} />
        <Metric icon={Award} label="Eligible" value={stats.eligible} />
        <Metric icon={CalendarDays} label="Sessions" value={stats.sessions} />
      </div>
    </>
  );
}

function SessionManager() {
  const empty = { title: '', description: '', speakerName: '', startTime: '', endTime: '', location: '', sortOrder: 1 };
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const load = () => apiRequest('/sessions').then((data) => setSessions(data.sessions));
  useEffect(() => { load(); }, []);

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      await apiRequest(editingId ? `/admin/sessions/${editingId}` : '/admin/sessions', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      setForm(empty);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(session) {
    setEditingId(session.id);
    setForm({
      title: session.title,
      description: session.description || '',
      speakerName: session.speakerName || '',
      startTime: session.startTime,
      endTime: session.endTime,
      location: session.location || '',
      sortOrder: session.sortOrder,
    });
  }

  async function remove(id) {
    await apiRequest(`/admin/sessions/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <>
      <SectionHeader title="Sessions" subtitle="Single-track schedule for attendees." />
      <form className="inline-form" onSubmit={save}>
        <TextInput label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} />
        <TextInput label="Speaker" value={form.speakerName} onChange={(speakerName) => setForm({ ...form, speakerName })} />
        <TextInput label="Start time" value={form.startTime} onChange={(startTime) => setForm({ ...form, startTime })} />
        <TextInput label="End time" value={form.endTime} onChange={(endTime) => setForm({ ...form, endTime })} />
        <TextInput label="Location" value={form.location} onChange={(location) => setForm({ ...form, location })} />
        <TextInput label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
        <button className="primary-button">{editingId ? 'Update session' : 'Add session'}</button>
        {editingId && <button type="button" className="ghost-button" onClick={() => { setEditingId(null); setForm(empty); }}>Cancel</button>}
      </form>
      {error && <div className="error">{error}</div>}
      <div className="list">
        {sessions.map((session) => (
          <article className="row-card" key={session.id}>
            <div>
              <strong>{session.startTime} - {session.endTime}</strong>
              <h3>{session.title}</h3>
              <p>{session.speakerName || 'No speaker'} {session.location ? `- ${session.location}` : ''}</p>
            </div>
            <div className="actions">
              <button className="ghost-button" onClick={() => edit(session)}>Edit</button>
              <button className="danger-button" onClick={() => remove(session.id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function RegistrationManager() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const load = () => apiRequest('/admin/registrations').then((data) => setRows(data.registrations));
  useEffect(() => { load(); }, []);
  const filtered = rows.filter((row) => `${row.name} ${row.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <SectionHeader title="Registrations" subtitle="Attendee accounts and registration state." />
      <SearchBox value={search} onChange={setSearch} />
      <DataTable rows={filtered} columns={['name', 'email', 'organization', 'status', 'attended']} />
    </>
  );
}

function AttendanceManager() {
  const [rows, setRows] = useState([]);
  const [qr, setQr] = useState(null);
  const load = () => apiRequest('/admin/attendance').then((data) => setRows(data.attendance));
  useEffect(() => { load(); }, []);

  async function generateQr() {
    setQr(await apiRequest('/admin/attendance/qr-tokens', { method: 'POST' }));
  }

  async function setAttendance(userId, status) {
    await apiRequest(`/admin/attendance/${userId}`, { method: 'PUT', body: JSON.stringify({ status }) });
    load();
  }

  return (
    <>
      <SectionHeader title="Attendance" subtitle="QR self-attendance plus manual corrections." />
      <div className="qr-layout">
        <div className="qr-box">
          {qr ? <img src={qr.qrDataUrl} alt="Attendance QR" /> : <QrCode size={96} />}
          <button className="primary-button" onClick={generateQr}>
            <RefreshCw size={16} />
            Generate QR
          </button>
          {qr && <p>Expires: {new Date(qr.expiresAt).toLocaleString()}</p>}
        </div>
        <div className="list compact">
          {rows.map((row) => (
            <article className="row-card" key={row.userId}>
              <div>
                <h3>{row.name}</h3>
                <p>{row.email} - {row.attended ? `Attended ${new Date(row.markedAt).toLocaleString()}` : 'Not attended'}</p>
              </div>
              <button className={row.attended ? 'danger-button' : 'primary-button'} onClick={() => setAttendance(row.userId, row.attended ? 'revoked' : 'attended')}>
                {row.attended ? 'Revoke' : 'Mark'}
              </button>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

function CertificateManager() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    apiRequest('/admin/certificates').then((data) => setRows(data.certificates));
  }, []);
  return (
    <>
      <SectionHeader title="Certificates" subtitle="Eligibility and PDF downloads." />
      <div className="list">
        {rows.map((row) => (
          <article className="row-card" key={row.userId}>
            <div>
              <h3>{row.name}</h3>
              <p>{row.email} - {row.eligible ? 'Eligible' : 'Waiting for attendance'}</p>
            </div>
            <a className={`button-link ${row.eligible ? '' : 'disabled'}`} href={`${API_URL}/admin/certificates/${row.userId}/download?token=${localStorage.getItem('token')}`}>
              <Download size={16} />
              PDF
            </a>
          </article>
        ))}
      </div>
    </>
  );
}

function AttendeeApp() {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    apiRequest('/attendee/me').then(setProfile);
    apiRequest('/sessions').then((data) => setSessions(data.sessions));
  }, []);
  if (!profile) return <StatusCard title="Loading" text="Preparing your workshop dashboard..." />;
  return (
    <div className="attendee-grid">
      <section className="panel">
        <SectionHeader title="My Workshop" subtitle="Your registration, attendance, and certificate status." />
        <div className="metric-grid">
          <Metric icon={Ticket} label="Registration" value={profile.registrationStatus} />
          <Metric icon={ClipboardCheck} label="Attendance" value={profile.attended ? 'Confirmed' : 'Pending'} />
          <Metric icon={Award} label="Certificate" value={profile.certificateEligible ? 'Ready' : 'Locked'} />
        </div>
        <a className={`button-link big ${profile.certificateEligible ? '' : 'disabled'}`} href={`${API_URL}/certificates/me/download?token=${localStorage.getItem('token')}`}>
          <Download size={18} />
          Download Certificate
        </a>
      </section>
      <section className="panel">
        <SectionHeader title="Schedule" subtitle="Today’s single-track program." />
        <div className="timeline">
          {sessions.map((session) => (
            <article key={session.id}>
              <time>{session.startTime} - {session.endTime}</time>
              <h3>{session.title}</h3>
              <p>{session.speakerName || 'Workshop Team'}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AttendanceConfirm({ user }) {
  const [state, setState] = useState({ status: 'loading', message: 'Confirming attendance...' });
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    apiRequest('/attendance/confirm', { method: 'POST', body: JSON.stringify({ token }) })
      .then((data) => setState({ status: 'success', message: data.alreadyAttended ? 'Attendance was already confirmed.' : 'Attendance confirmed.' }))
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, []);
  return (
    <section className="panel centered">
      {state.status === 'success' ? <CheckCircle2 size={56} /> : <QrCode size={56} />}
      <h1>{state.message}</h1>
      <p>{user.name}</p>
    </section>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="section-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function SearchBox({ value, onChange }) {
  return (
    <label className="search-box">
      <Search size={18} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search" />
    </label>
  );
}

function DataTable({ rows, columns }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || row.userId}>
              {columns.map((column) => <td key={column}>{String(row[column] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusCard({ title, text }) {
  return (
    <section className="panel centered">
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
