'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Problem, Contest, Language, LANGUAGE_CONFIG } from '@/lib/types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => <div style={{ height: 400, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading editor...</div> });

interface JudgeResult {
  verdict: string; output?: string; expected?: string;
  score?: number; passed?: number; total?: number; runtime_ms?: number;
}

export default function ProblemsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const participantId = searchParams.get('pid') || '';

  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isDanger, setIsDanger] = useState(false);

  const [language, setLanguage] = useState<Language>('cpp');
  const [code, setCode] = useState(LANGUAGE_CONFIG['cpp'].template);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<JudgeResult | null>(null);
  const [submitResult, setSubmitResult] = useState<JudgeResult | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, string>>({});

  const [showWarning, setShowWarning] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const autoSubmitted = useRef(false);

  // Load contest + problems
  useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from('contests').select('*').eq('slug', slug).single();
      if (!c) return;
      setContest(c);
      const { data: p } = await supabase.from('problems').select('*').eq('contest_id', c.id).order('order_index');
      if (p && p.length > 0) {
        setProblems(p);
        setSelectedProblem(p[0]);
      }
    }
    load();
  }, [slug]);

  // Load best verdicts for this participant
  useEffect(() => {
    if (!participantId || problems.length === 0) return;
    async function loadVerdicts() {
      const { data } = await supabase
        .from('submissions')
        .select('problem_id, verdict, score')
        .eq('participant_id', participantId)
        .in('problem_id', problems.map(p => p.id));
      if (!data) return;
      const v: Record<string, string> = {};
      for (const s of data) {
        if (!v[s.problem_id] || (s.verdict === 'AC' && v[s.problem_id] !== 'AC') || s.score > 0) {
          v[s.problem_id] = s.verdict;
        }
      }
      setVerdicts(v);
    }
    loadVerdicts();
  }, [participantId, problems]);

  // Timer
  useEffect(() => {
    if (!contest) return;
    const tick = () => {
      const end = new Date(contest.end_time).getTime();
      const diff = end - Date.now();
      if (diff <= 0) {
        setTimeLeft('0:00:00');
        setIsExpired(true);
        if (!autoSubmitted.current) {
          autoSubmitted.current = true;
        }
        return;
      }
      setIsDanger(diff < 300000); // last 5 min
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [contest]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitches(p => p + 1);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Save code in localStorage per problem+language
  const getSaveKey = useCallback((prob: Problem | null, lang: Language) =>
    prob ? `code_${prob.id}_${lang}` : '', []);

  useEffect(() => {
    if (!selectedProblem) return;
    const saved = localStorage.getItem(getSaveKey(selectedProblem, language));
    setCode(saved || LANGUAGE_CONFIG[language].template);
    setRunResult(null);
    setSubmitResult(null);
  }, [selectedProblem, language, getSaveKey]);

  const handleCodeChange = (val: string | undefined) => {
    const v = val || '';
    setCode(v);
    if (selectedProblem) localStorage.setItem(getSaveKey(selectedProblem, language), v);
  };

  async function handleRun() {
    if (!selectedProblem || isExpired) return;
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId, problem_id: selectedProblem.id, language, code, mode: 'run' }),
      });
      setRunResult(await res.json());
    } catch { setRunResult({ verdict: 'error', output: 'Network error' }); }
    setRunning(false);
  }

  async function handleSubmit() {
    if (!selectedProblem || isExpired || !participantId) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId, problem_id: selectedProblem.id, language, code, mode: 'submit' }),
      });
      const result = await res.json();
      setSubmitResult(result);
      if (result.verdict) {
        setVerdicts(prev => {
          const current = prev[selectedProblem.id];
          if (result.verdict === 'AC' || !current) return { ...prev, [selectedProblem.id]: result.verdict };
          return prev;
        });
      }
    } catch { setSubmitResult({ verdict: 'error', output: 'Network error' }); }
    setSubmitting(false);
  }

  if (!contest) return <LoadingScreen />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Navbar */}
      <nav className="navbar" style={{ flexShrink: 0 }}>
        <div className="navbar-brand">
          <div className="logo-icon">⚡</div>
          <span className="hide-mobile">{contest.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`timer ${isDanger ? 'danger' : ''}`}>
            {isDanger && <span>🔴</span>}
            {!isDanger && <span>⏱</span>}
            <span>{timeLeft || '...'}</span>
          </div>
          <a href={`/contest/${slug}/leaderboard`} target="_blank" className="btn btn-ghost btn-sm">🏆 Board</a>
        </div>
      </nav>

      {/* Tab switch warning */}
      {showWarning && (
        <div className="tab-warning">⚠️ Tab switch detected ({tabSwitches}x) — Stay focused!</div>
      )}

      {/* Expired banner */}
      {isExpired && (
        <div style={{ background: 'var(--red-bg)', borderBottom: '1px solid var(--red)', padding: '10px 24px', textAlign: 'center', color: 'var(--red)', fontWeight: 700, flexShrink: 0 }}>
          🔴 Contest has ended. No more submissions accepted.
        </div>
      )}

      {/* Main layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — problem list */}
        <aside style={{ width: 220, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '12px 0', flexShrink: 0 }}>
          <div style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
            Problems
          </div>
          {problems.map((p, i) => {
            const v = verdicts[p.id];
            const isSelected = selectedProblem?.id === p.id;
            return (
              <button key={p.id} onClick={() => setSelectedProblem(p)} style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px',
                background: isSelected ? 'var(--bg-hover)' : 'transparent',
                borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left', border: 'none', outline: 'none', color: 'var(--text-primary)',
                fontFamily: 'inherit', fontSize: '13px', transition: 'all 0.15s',
              }}>
                <div className={`problem-status ${v === 'AC' ? 'ac' : v ? 'wa' : 'pending'}`} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>P{i + 1}. {p.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.points} pts</div>
                </div>
              </button>
            );
          })}
          {problems.length === 0 && (
            <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>No problems yet</div>
          )}
        </aside>

        {/* Center — problem statement */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', minWidth: 0 }}>
          {selectedProblem ? (
            <ProblemStatement problem={selectedProblem} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Select a problem from the sidebar
            </div>
          )}
        </div>

        {/* Right — editor */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', minWidth: 0 }}>
          {/* Editor toolbar */}
          <div className="editor-toolbar" style={{ flexShrink: 0 }}>
            <select
              className="select"
              value={language}
              onChange={e => setLanguage(e.target.value as Language)}
              style={{ width: 'auto', padding: '5px 10px', fontSize: '13px' }}
              disabled={isExpired}
            >
              {(Object.keys(LANGUAGE_CONFIG) as Language[]).map(l => (
                <option key={l} value={l}>{LANGUAGE_CONFIG[l].label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={handleRun} disabled={running || submitting || isExpired || !selectedProblem}>
                {running ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Running...</> : '▶ Run'}
              </button>
              <button className="btn btn-success btn-sm" onClick={handleSubmit} disabled={submitting || running || isExpired || !participantId || !selectedProblem}>
                {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Judging...</> : '✔ Submit'}
              </button>
            </div>
          </div>

          {/* Monaco */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <MonacoEditor
              height="100%"
              language={selectedProblem ? LANGUAGE_CONFIG[language].monacoLang : 'plaintext'}
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                tabSize: 4,
                readOnly: isExpired,
              }}
            />
          </div>

          {/* Results */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', maxHeight: '220px', overflowY: 'auto', flexShrink: 0 }}>
            {runResult && (
              <div className={`result-box ${runResult.verdict === 'AC' ? 'ac' : runResult.verdict === 'error' ? 'error' : 'wa'}`}>
                <strong>Sample Test: {runResult.verdict === 'AC' ? '✅ Passed' : runResult.verdict === 'CE' ? '⚠️ Compile Error' : runResult.verdict === 'error' ? '⚠️ Error' : '❌ Wrong Answer'}</strong>
                {runResult.runtime_ms != null && <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.8 }}>{runResult.runtime_ms}ms</span>}
                {runResult.output && <pre>{runResult.output.slice(0, 800)}</pre>}
                {runResult.expected && runResult.verdict !== 'AC' && <pre style={{ marginTop: 8, opacity: 0.7 }}>Expected: {runResult.expected}</pre>}
              </div>
            )}
            {submitResult && (
              <div className={`result-box ${submitResult.verdict === 'AC' ? 'ac' : submitResult.verdict === 'error' ? 'error' : 'wa'}`} style={{ marginTop: runResult ? 8 : 0 }}>
                <strong>
                  {submitResult.verdict === 'AC' && `✅ Accepted — ${submitResult.score} pts`}
                  {submitResult.verdict === 'WA' && `❌ Wrong Answer (${submitResult.passed}/${submitResult.total} passed)`}
                  {submitResult.verdict === 'TLE' && `⏰ Time Limit Exceeded`}
                  {submitResult.verdict === 'CE' && `⚠️ Compile Error`}
                  {submitResult.verdict === 'RE' && `💥 Runtime Error`}
                  {submitResult.verdict === 'error' && `⚠️ Judge Error`}
                </strong>
                {submitResult.runtime_ms != null && <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.8 }}>Total runtime: {submitResult.runtime_ms}ms</span>}
                {submitResult.output && <pre>{submitResult.output.slice(0, 800)}</pre>}
              </div>
            )}
            {!runResult && !submitResult && (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Run your code against sample input, or Submit to judge against all test cases.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProblemStatement({ problem }: { problem: Problem }) {
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>{problem.title}</h1>
          <span style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(108,99,255,0.3)', padding: '3px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
            {problem.points} pts
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>⏱ Time Limit: {problem.time_limit_ms}ms</span>
        </div>
      </div>

      <Section title="Problem Statement">
        <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{problem.statement}</div>
      </Section>

      {problem.input_format && <Section title="Input Format"><div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.8 }}>{problem.input_format}</div></Section>}
      {problem.output_format && <Section title="Output Format"><div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.8 }}>{problem.output_format}</div></Section>}
      {problem.constraints && <Section title="Constraints"><div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', lineHeight: 1.8 }}>{problem.constraints}</div></Section>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Sample Input</div>
          <pre style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-primary)' }}>{problem.sample_input || 'N/A'}</pre>
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Sample Output</div>
          <pre style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-primary)' }}>{problem.sample_output || 'N/A'}</pre>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>{title}</h2>
      {children}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 36, height: 36, marginBottom: 16 }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading contest...</p>
      </div>
    </div>
  );
}
