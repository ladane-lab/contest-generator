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

type Tab = 'contests' | 'create';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<Tab>('contests');

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === 'pccoe_admin_2025') setAuthed(true);
    else setAuthError('Wrong password');
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 360, textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔐</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Admin Access</h1>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="password" className="input" placeholder="Admin password"
              value={password} onChange={e => { setPassword(e.target.value); setAuthError(''); }}
              autoFocus required
            />
            {authError && <p style={{ color: 'var(--red)', fontSize: '13px' }}>{authError}</p>}
            <button type="submit" className="btn btn-primary">Enter Admin Panel</button>
          </form>
          <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>Default: pccoe_admin_2025</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="navbar-brand"><div className="logo-icon">⚡</div><span>Admin Panel</span></div>
        <div className="flex gap-2">
          <button className={`btn btn-sm ${tab === 'contests' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('contests')}>My Contests</button>
          <button className={`btn btn-sm ${tab === 'create' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('create')}>+ New Contest</button>
          <a href="/" className="btn btn-ghost btn-sm">← Home</a>
        </div>
      </nav>

      <div className="container" style={{ padding: '32px 24px' }}>
        {tab === 'contests' && <ContestList onNew={() => setTab('create')} />}
        {tab === 'create' && <CreateContest onCreated={() => setTab('contests')} />}
      </div>
    </div>
  );
}

function ContestList({ onNew }: { onNew: () => void }) {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />Loading...</div>;

  if (contests.length === 0) return (
    <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏁</div>
      <h2 style={{ marginBottom: '8px' }}>No contests yet</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Create your first contest to get started.</p>
      <button className="btn btn-primary" onClick={onNew}>+ Create Contest</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Contest Management</h1>
        <button className="btn btn-primary btn-sm" onClick={onNew}>+ New Contest</button>
      </div>
      {contests.map(c => (
        <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{c.title}</h2>
                <span style={{ background: c.is_active ? 'var(--green-bg)' : 'var(--bg-tertiary)', color: c.is_active ? 'var(--green)' : 'var(--text-muted)', border: `1px solid ${c.is_active ? 'var(--green)' : 'var(--border)'}`, padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span>🔗 /contest/<strong style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>{c.slug}</strong></span>
                <span>📅 {new Date(c.start_time).toLocaleString()}</span>
                <span>⏰ ends {new Date(c.end_time).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-2" style={{ flexShrink: 0 }}>
              <a href={`/contest/${c.slug}`} target="_blank" className="btn btn-ghost btn-sm">Open</a>
              <a href={`/contest/${c.slug}/leaderboard`} target="_blank" className="btn btn-ghost btn-sm">🏆 Board</a>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleExpand(c.id)}>{expandedId === c.id ? '▲' : '▼'} Problems</button>
              <button className="btn btn-danger btn-sm" onClick={() => deleteContest(c.id)}>Delete</button>
            </div>
          </div>

          {/* Share link */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 24px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Share link:</span>
            <code style={{ flex: 1, fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'var(--accent)' }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/contest/${c.slug}` : `/contest/${c.slug}`}
            </code>
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/contest/${c.slug}`)}>Copy</button>
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
      const { error: err } = await supabase.from('contests').insert({ ...form, is_active: true });
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
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginTop: '8px' }}>
          <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>Problem #{currentCount + 1}</h4>
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
              <button className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, test_cases: [...f.test_cases, { input: '', expected_output: '', is_hidden: true }] }))}>
                + Add Test Case
              </button>
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
