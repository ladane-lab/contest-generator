'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Contest, Problem } from '@/lib/types';

interface TestCaseInput { input: string; expected_output: string; is_hidden: boolean; }
interface ProblemInput {
  title: string; statement: string; input_format: string; output_format: string;
  constraints: string; points: number; time_limit_ms: number;
  sample_input: string; sample_output: string; test_cases: TestCaseInput[];
}

const DEFAULT_PROBLEM: ProblemInput = {
  title: '', statement: '', input_format: '', output_format: '',
  constraints: '', points: 100, time_limit_ms: 2000,
  sample_input: '', sample_output: '', test_cases: [{ input: '', expected_output: '', is_hidden: false }],
};

type Tab = 'contests' | 'create' | 'settings';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<Tab>('contests');

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('isAdmin') === 'true') {
      setAuthed(true);
    }
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'pccoe_admin_2025';
    if (password === correctPassword) {
      setAuthed(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('isAdmin', 'true');
        localStorage.setItem('isAdmin', 'true');
      }
    }
    else setAuthError('Invalid credentials. Please try again.');
  }

  if (!authed) {
    return (
      <div className="hero bg-animate" style={{ padding: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="floating-symbols">
          <div className="symbol">{'{ }'}</div>
          <div className="symbol">{'</>'}</div>
          <div className="symbol">{'++'}</div>
          <div className="symbol">{'[ ]'}</div>
          <div className="symbol">{'#'}</div>
          <div className="symbol">{'const'}</div>
          <div className="symbol">{'f()'}</div>
        </div>
        <div className="card glass-card" style={{ width: 380, textAlign: 'center', zIndex: 1, padding: '32px', background: 'rgba(255, 255, 255, 0.95)' }}>
          <div style={{ width: 56, height: 56, background: 'var(--accent-glow)', color: 'var(--accent)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '4px', color: 'var(--text-primary)' }}>Admin Portal</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '13px' }}>Secure dashboard access.</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Administrator Password</label>
              <input
                type="password" className="input" placeholder="••••••••"
                style={{ padding: '10px 14px' }}
                value={password} onChange={e => { setPassword(e.target.value); setAuthError(''); }}
                autoFocus required
              />
            </div>
            {authError && <p style={{ color: 'var(--red)', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{authError}</p>}
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '4px' }}>
              Access Dashboard
            </button>
          </form>
          <a href="/" style={{ display: 'block', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>← Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-2 10h8L11 22l2-10H5L13 2Z"/></svg>
          </div>
          <span>Admin Dashboard</span>
        </div>
        <div className="flex gap-2">
          <button className={`btn btn-sm ${tab === 'contests' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('contests')}>Contests</button>
          <button className={`btn btn-sm ${tab === 'create' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('create')}>+ Create</button>
          <button className={`btn btn-sm ${tab === 'settings' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('settings')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            Settings
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 8px' }} />
          <a href="/" className="btn btn-ghost btn-sm">Exit</a>
        </div>
      </nav>

      <div className="container" style={{ padding: '40px 24px' }}>
        {tab === 'contests' && <ContestList onNew={() => setTab('create')} />}
        {tab === 'create' && <CreateContest onCreated={() => setTab('contests')} />}
        {tab === 'settings' && <GlobalSettings />}
      </div>
    </div>
  );
}

function GlobalSettings() {
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('settings').select('*').eq('key', 'event_name').single();
      if (data) setEventName(data.value);
      setLoading(false);
    }
    fetchSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('settings').upsert({ key: 'event_name', value: eventName });
    if (error) {
      setMessage({ text: 'Failed to update settings', type: 'error' });
    } else {
      setMessage({ text: 'Settings updated successfully!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
    setSaving(false);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>Platform Branding</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
        Configure the general branding for the home screen and public portals.
      </p>
      <div className="card">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="form-group">
            <label className="form-label">Event Name</label>
            <input
              className="input"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="e.g. Decode to Code"
              required
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              This name will be displayed across the platform (Home, Navbar, etc.)
            </p>
          </div>

          {message.text && (
            <div className={`result-box ${message.type === 'success' ? 'ac' : 'error'}`}>
              {message.text}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ContestList({ onNew }: { onNew: () => void }) {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', start_time: '', end_time: '' });
  const [problems, setProblems] = useState<Record<string, Problem[]>>({});

  useEffect(() => {
    supabase.from('contests').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setContests(data || []); setLoading(false); });
  }, []);

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!problems[id]) {
      const { data } = await supabase.from('problems').select('*').eq('contest_id', id).order('order_index');
      setProblems(p => ({ ...p, [id]: data || [] }));
    }
  }

  async function deleteContest(id: string) {
    if (!confirm('Delete this contest and all its data?')) return;
    await supabase.from('contests').delete().eq('id', id);
    setContests(c => c.filter(x => x.id !== id));
  }

  async function startEditing(c: Contest) {
    setEditingId(c.id);
    setEditForm({ title: c.title, start_time: c.start_time.split('.')[0], end_time: c.end_time.split('.')[0] });
  }

  async function saveEdit(id: string) {
    const { error } = await supabase.from('contests').update(editForm).eq('id', id);
    if (error) {
      alert('Failed to update contest: ' + error.message);
    } else {
      setContests(contests.map(c => c.id === id ? { ...c, ...editForm } : c));
      setEditingId(null);
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />Loading...</div>;

  if (contests.length === 0) return (
    <div className="card" style={{ textAlign: 'center', padding: '80px 40px', background: 'var(--bg-secondary)', border: '2px dashed var(--border)' }}>
      <div style={{ width: 80, height: 80, background: 'var(--bg-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--text-muted)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>
      </div>
      <h2 style={{ marginBottom: '8px', fontWeight: 800 }}>No Contests Found</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: 300, margin: '0 auto 32px' }}>Start your competition by creating your very first DSA contest arena.</p>
      <button className="btn btn-primary btn-lg" onClick={onNew}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Create New Contest
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Contest Management</h1>
        <button className="btn btn-primary btn-sm" onClick={onNew}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          New Contest
        </button>
      </div>
      {contests.map(c => (
        <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              {editingId === c.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Contest Title (Event Name)</label>
                    <input className="input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Start Time</label>
                      <input type="datetime-local" className="input" value={editForm.start_time} onChange={e => setEditForm({ ...editForm, start_time: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">End Time</label>
                      <input type="datetime-local" className="input" value={editForm.end_time} onChange={e => setEditForm({ ...editForm, end_time: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => saveEdit(c.id)}>Save Changes</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{c.title}</h2>
                    {(() => {
                      const now = Date.now();
                      const start = new Date(c.start_time).getTime();
                      const end = new Date(c.end_time).getTime();
                      let statusText = 'Upcoming';
                      let statusColor = 'var(--blue)';
                      let statusBg = 'var(--blue-bg)';

                      if (now >= start && now < end) {
                        statusText = 'Live';
                        statusColor = 'var(--green)';
                        statusBg = 'var(--green-bg)';
                      } else if (now >= end) {
                        statusText = 'Ended';
                        statusColor = 'var(--red)';
                        statusBg = 'var(--red-bg)';
                      }

                      return (
                        <span style={{
                          background: statusBg, color: statusColor,
                          border: `1px solid ${statusColor}`,
                          padding: '2px 10px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: 700
                        }}>
                          {statusText}
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                      <span>{new Date(c.start_time).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <span>ends {new Date(c.end_time).toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            {editingId !== c.id && (
              <div className="flex gap-2" style={{ flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => startEditing(c)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                <a href={`/contest/${c.slug}`} target="_blank" className="btn btn-ghost btn-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                  Open
                </a>
                <a href={`/contest/${c.slug}/leaderboard`} target="_blank" className="btn btn-ghost btn-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                  Board
                </a>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleExpand(c.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, transform: expandedId === c.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="m6 9 6 6 6-6"/></svg>
                  Problems
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteContest(c.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Share link */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '14px 24px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--bg-primary)', color: 'var(--accent)', width: 28, height: 28, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <code style={{ flex: 1, fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/contest/${c.slug}` : `/contest/${c.slug}`}
            </code>
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/contest/${c.slug}`)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              Copy
            </button>
          </div>

          {/* Problems list */}
          {expandedId === c.id && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px' }}>Problems</h3>
              {(problems[c.id] || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No problems added yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(problems[c.id] || []).map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>P{i + 1}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '14px' }}>{p.title}</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '13px' }}>{p.points} pts</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{p.time_limit_ms}ms</span>
                    </div>
                  ))}
                </div>
              )}
              <AddProblemInline contestId={c.id} onAdded={() => {
                supabase.from('problems').select('*').eq('contest_id', c.id).order('order_index')
                  .then(({ data }) => setProblems(p => ({ ...p, [c.id]: data || [] })));
              }} currentCount={(problems[c.id] || []).length} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CreateContest({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ title: '', slug: '', description: '', start_time: '', end_time: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      // Append local timezone offset to ensure Postgres stores the exact intended local moment
      const toLocalISO = (localTzStr: string) => {
        const d = new Date(localTzStr);
        const offset = d.getTimezoneOffset();
        const sign = offset > 0 ? '-' : '+';
        const absOffset = Math.abs(offset);
        const hh = String(Math.floor(absOffset / 60)).padStart(2, '0');
        const mm = String(absOffset % 60).padStart(2, '0');
        return `${localTzStr}:00${sign}${hh}:${mm}`;
      };

      const submitForm = {
        ...form,
        start_time: toLocalISO(form.start_time),
        end_time: toLocalISO(form.end_time),
        is_active: true
      };

      const { error: err } = await supabase.from('contests').insert(submitForm);
      if (err) {
        console.error('Supabase error:', err);
        setError(err.message || 'Database error occurred');
        setSaving(false);
        return;
      }
      onCreated();
    } catch (err: any) {
      console.error('Fetch/Network error:', err);
      setError(err.message || 'Failed to connect to browser. Is the server running? Check console.');
      setSaving(false);
    }
  }

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>Create New Contest</h1>
      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Contest Title *</label>
            <input className="input" placeholder="e.g. Decode to Code – DSA Round 1" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Slug (URL key) *</label>
            <input className="input font-mono" placeholder="e.g. decode2code" value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} required />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Share link will be: <strong style={{ color: 'var(--accent)' }}>/contest/{form.slug || 'your-slug'}</strong>
            </span>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="textarea" placeholder="Brief description for participants..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 80 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input type="datetime-local" className="input" value={form.start_time} required
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input type="datetime-local" className="input" value={form.end_time} required
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>
          {error && <div className="result-box error"><strong>Error: </strong>{error}</div>}
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating...</> : 'Create Contest'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onCreated}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddProblemInline({ contestId, onAdded, currentCount }: { contestId: string; onAdded: () => void; currentCount: number }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProblemInput>({ ...DEFAULT_PROBLEM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateTC(i: number, field: keyof TestCaseInput, val: string | boolean) {
    setForm(f => {
      const tcs = [...f.test_cases];
      tcs[i] = { ...tcs[i], [field]: val };
      return { ...f, test_cases: tcs };
    });
  }

  async function handleSave() {
    if (!form.title.trim() || !form.statement.trim()) { setError('Title and statement are required.'); return; }
    setSaving(true); setError('');
    const { data: prob, error: err } = await supabase.from('problems').insert({
      contest_id: contestId, title: form.title, statement: form.statement,
      input_format: form.input_format, output_format: form.output_format,
      constraints: form.constraints, points: form.points, time_limit_ms: form.time_limit_ms,
      sample_input: form.sample_input, sample_output: form.sample_output,
      order_index: currentCount,
    }).select().single();
    if (err || !prob) { setError(err?.message || 'Failed to save'); setSaving(false); return; }

    const validTCs = form.test_cases.filter(tc => tc.input && tc.expected_output);
    if (validTCs.length > 0) {
      await supabase.from('test_cases').insert(validTCs.map(tc => ({ ...tc, problem_id: prob.id })));
    }

    setForm({ ...DEFAULT_PROBLEM });
    setOpen(false);
    setSaving(false);
    onAdded();
  }

  return (
    <div style={{ marginTop: '16px' }}>
      {!open ? (
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>+ Add Problem</button>
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px', marginTop: '12px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid var(--bg-secondary)', paddingBottom: '16px' }}>
            <h4 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)' }}>Problem #{currentCount + 1}</h4>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>NEW DRAFT</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="input" placeholder="Problem title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Points</label>
                <input type="number" className="input" value={form.points} onChange={e => setForm(f => ({ ...f, points: +e.target.value }))} min={10} max={1000} step={10} />
              </div>
              <div className="form-group">
                <label className="form-label">Time Limit (ms)</label>
                <input type="number" className="input" value={form.time_limit_ms} onChange={e => setForm(f => ({ ...f, time_limit_ms: +e.target.value }))} min={500} max={10000} step={500} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Problem Statement *</label>
              <textarea className="textarea" style={{ minHeight: 120 }} placeholder="Describe the problem clearly. Supports plain text." value={form.statement} onChange={e => setForm(f => ({ ...f, statement: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Input Format</label>
                <textarea className="textarea" style={{ minHeight: 70 }} placeholder="Describe input format" value={form.input_format} onChange={e => setForm(f => ({ ...f, input_format: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Output Format</label>
                <textarea className="textarea" style={{ minHeight: 70 }} placeholder="Describe output format" value={form.output_format} onChange={e => setForm(f => ({ ...f, output_format: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Constraints</label>
              <input className="input font-mono" placeholder="e.g. 1 ≤ N ≤ 10^5, 1 ≤ A[i] ≤ 10^9" value={form.constraints} onChange={e => setForm(f => ({ ...f, constraints: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Sample Input</label>
                <textarea className="textarea font-mono" style={{ minHeight: 80 }} value={form.sample_input} onChange={e => setForm(f => ({ ...f, sample_input: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Sample Output</label>
                <textarea className="textarea font-mono" style={{ minHeight: 80 }} value={form.sample_output} onChange={e => setForm(f => ({ ...f, sample_output: e.target.value }))} />
              </div>
            </div>

            {/* Test Cases */}
            <div>
              <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>Test Cases</label>
              {form.test_cases.map((tc, i) => (
                <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Test Case #{i + 1}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={tc.is_hidden} onChange={e => updateTC(i, 'is_hidden', e.target.checked)} />
                      Hidden
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Input</label>
                      <textarea className="textarea font-mono" style={{ minHeight: 70 }} value={tc.input} onChange={e => updateTC(i, 'input', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Expected Output</label>
                      <textarea className="textarea font-mono" style={{ minHeight: 70 }} value={tc.expected_output} onChange={e => updateTC(i, 'expected_output', e.target.value)} />
                    </div>
                  </div>
                  {form.test_cases.length > 1 && (
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '8px' }} onClick={() => setForm(f => ({ ...f, test_cases: f.test_cases.filter((_, j) => j !== i) }))}>Remove</button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, test_cases: [...f.test_cases, { input: '', expected_output: '', is_hidden: true }] }))}>
                  + Add Test Case
                </button>
                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    accept=".json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const text = await file.text();
                        const parsed = JSON.parse(text);
                        if (Array.isArray(parsed)) {
                          const newTcs = parsed.map(item => ({
                            input: String(item.input || ''),
                            expected_output: String(item.expected_output || ''),
                            is_hidden: item.is_hidden !== undefined ? !!item.is_hidden : true
                          })).filter(tc => tc.input && tc.expected_output);

                          if (newTcs.length > 0) {
                            setForm(f => {
                              const current = f.test_cases;
                              const isDefaultEmpty = current.length === 1 && !current[0].input && !current[0].expected_output;
                              return { ...f, test_cases: isDefaultEmpty ? newTcs : [...current, ...newTcs] };
                            });
                            alert(`Successfully imported ${newTcs.length} test cases!`);
                          } else {
                            alert('No valid test cases found in JSON. Format should be: [{ "input": "...", "expected_output": "...", "is_hidden": true }]');
                          }
                        } else {
                          alert('JSON must be an array of test case objects.');
                        }
                      } catch (err) {
                        alert('Invalid JSON file.');
                      }
                      e.target.value = '';
                    }}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                    title="Upload JSON file with test cases"
                  />
                  <button type="button" className="btn btn-ghost btn-sm" style={{ pointerEvents: 'none' }}>
                    📁 Bulk Import (.json)
                  </button>
                </div>
              </div>
            </div>

            {error && <div className="result-box error">{error}</div>}
            <div className="flex gap-3">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : 'Save Problem'}
              </button>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
