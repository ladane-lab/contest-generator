'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Problem, Contest, Language, LANGUAGE_CONFIG } from '@/lib/types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 400, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Loading editor...
    </div>
  ),
});

interface JudgeResult {
  verdict: string; output?: string; expected?: string; input?: string;
  score?: number; passed?: number; total?: number; runtime_ms?: number;
}

// ─── Anti-cheat config ────────────────────────────────────────────────────────
const MAX_PASTE_CHARS = 50; // max characters allowed in a single paste
const BLOCK_AT        = 3;  // block student on this switch number (1-indexed)
// Switches 1 … (BLOCK_AT-1) → warning modal
// Switch BLOCK_AT            → hard block: zero score + redirect

export default function ProblemsPage() {
  const params        = useParams();
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const slug          = params.slug as string;
  const participantId = searchParams.get('pid') || '';

  const [contest, setContest]                   = useState<Contest | null>(null);
  const [problems, setProblems]                 = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem]   = useState<Problem | null>(null);
  const [timeLeft, setTimeLeft]                 = useState('');
  const [isExpired, setIsExpired]               = useState(false);
  const [isLive, setIsLive]                     = useState(false);
  const [isDanger, setIsDanger]                 = useState(false);

  const [language, setLanguage]     = useState<Language>('cpp');
  const [code, setCode]             = useState(LANGUAGE_CONFIG['cpp'].template);
  const [running, setRunning]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult]   = useState<JudgeResult | null>(null);
  const [submitResult, setSubmitResult] = useState<JudgeResult | null>(null);
  const [verdicts, setVerdicts]     = useState<Record<string, string>>({});

  // ─── Anti-cheat state ─────────────────────────────────────────────────────
  const [tabSwitches, setTabSwitches]           = useState(0);
  const [pasteBlocks, setPasteBlocks]           = useState(0);
  const [showWarnModal, setShowWarnModal]       = useState(false);
  const [warnSwitchNum, setWarnSwitchNum]       = useState(0);
  const [isBlocked, setIsBlocked]               = useState(false);   // hard-blocked state
  const [blockingInProgress, setBlockingInProgress] = useState(false); // while zeroing DB

  const tabSwitchesRef  = useRef(0);
  const blockingDoneRef = useRef(false);            // fire block action exactly once
  const autoSubmitted   = useRef(false);

  // ─── Anti-paste toast ─────────────────────────────────────────────────────
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg]   = useState('');
  const toastTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 4500);
  }, []);

  // ─── Load contest + problems ───────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from('contests').select('*').eq('slug', slug).single();
      if (!c) return;
      if (Date.now() < new Date(c.start_time).getTime()) {
        router.replace(`/contest/${slug}`);
        return;
      }
      setContest(c);
      const { data: p } = await supabase.from('problems').select('*').eq('contest_id', c.id).order('order_index');
      if (p && p.length > 0) { setProblems(p); setSelectedProblem(p[0]); }
    }
    load();
  }, [slug, router]);

  // ─── Load best verdicts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!participantId || problems.length === 0) return;
    async function loadVerdicts() {
      const { data } = await supabase
        .from('submissions').select('problem_id, verdict, score')
        .eq('participant_id', participantId)
        .in('problem_id', problems.map(p => p.id));
      if (!data) return;
      const v: Record<string, string> = {};
      for (const s of data) {
        if (!v[s.problem_id] || (s.verdict === 'AC' && v[s.problem_id] !== 'AC') || s.score > 0)
          v[s.problem_id] = s.verdict;
      }
      setVerdicts(v);
    }
    loadVerdicts();
  }, [participantId, problems]);

  // ─── Contest timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!contest) return;
    const tick = () => {
      const now   = Date.now();
      const start = new Date(contest.start_time).getTime();
      const end   = new Date(contest.end_time).getTime();
      if (now < start) {
        setIsLive(false);
        const diff = start - now;
        setTimeLeft(`Starts in ${fmt(diff)}`);
        setIsDanger(false);
        return;
      }
      setIsLive(true);
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('0:00:00'); setIsExpired(true); setIsLive(false);
        if (!autoSubmitted.current) autoSubmitted.current = true;
        return;
      }
      setIsDanger(diff < 300000);
      setTimeLeft(fmt(diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [contest]);

  // ─── BLOCK ACTION: zero scores + flag + redirect ───────────────────────────
  const executeBlock = useCallback(async () => {
    if (blockingDoneRef.current || !participantId) return;
    blockingDoneRef.current = true;
    setBlockingInProgress(true);

    try {
      // 1. Zero every submission score for this participant
      await supabase
        .from('submissions')
        .update({ score: 0, verdict: 'DISQUALIFIED' })
        .eq('participant_id', participantId);

      // 2. Mark participant as flagged/blocked
      await supabase
        .from('participants')
        .update({ is_flagged: true, tab_switches: BLOCK_AT })
        .eq('id', participantId);

      // 3. Log to cheat_logs (silent fail if table missing)
      try {
        await supabase.from('cheat_logs').insert({
          participant_id: participantId,
          event_type: 'hard_block',
          detail: `Blocked after ${BLOCK_AT} tab switches. All scores zeroed.`,
          occurred_at: new Date().toISOString(),
        });
      } catch (_) {}

      // 4. Wipe local storage so they can't re-enter via pid
      localStorage.removeItem(`participant_${slug}`);
    } catch (e) {
      console.error('Block action failed:', e);
    }

    setBlockingInProgress(false);
    setIsBlocked(true);
  }, [participantId, slug]);

  // ─── Tab switch detection ──────────────────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) return; // only trigger when tab leaves

      const newCount = tabSwitchesRef.current + 1;
      tabSwitchesRef.current = newCount;
      setTabSwitches(newCount);

      if (newCount >= BLOCK_AT) {
        // 3rd switch → hard block
        executeBlock();
      } else {
        // 1st or 2nd switch → warning modal
        setWarnSwitchNum(newCount);
        setShowWarnModal(true);

        // Log to DB silently
        if (participantId) {
          supabase.from('participants')
            .update({ tab_switches: newCount })
            .eq('id', participantId)
            .then(() => {});
          try {
            supabase.from('cheat_logs').insert({
              participant_id: participantId,
              event_type: 'tab_switch',
              detail: `Tab switch #${newCount}`,
              occurred_at: new Date().toISOString(),
            }).then(() => {});
          } catch (_) {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [participantId, executeBlock]);

  // ─── Block context-menu (right-click) ─────────────────────────────────────
  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, []);

  // ─── Save code per problem+language ───────────────────────────────────────
  const getSaveKey = useCallback(
    (prob: Problem | null, lang: Language) => prob ? `code_${prob.id}_${lang}` : '', []
  );

  useEffect(() => {
    if (!selectedProblem) return;
    const saved = localStorage.getItem(getSaveKey(selectedProblem, language));
    setCode(saved || LANGUAGE_CONFIG[language].template);
    setRunResult(null); setSubmitResult(null);
  }, [selectedProblem, language, getSaveKey]);

  const handleCodeChange = (val: string | undefined) => {
    const v = val || '';
    setCode(v);
    if (selectedProblem) localStorage.setItem(getSaveKey(selectedProblem, language), v);
  };

  // ─── Monaco onMount: TWO-LAYER paste guard ────────────────────────────────
  //
  // Layer 1 (keydown): Intercept Ctrl+V / Cmd+V BEFORE Monaco processes it.
  //   → Read clipboard text synchronously via clipboardData or async via
  //     navigator.clipboard.readText. If > MAX_PASTE_CHARS, cancel the event.
  //   → This means nothing ever appears in the editor at all.
  //
  // Layer 2 (onDidPaste): Safety net for drag-and-drop / right-click pastes
  //   that bypass the keyboard shortcut. These are caught AFTER insertion and
  //   immediately undone.
  //
  const handleEditorMount = useCallback((editor: any) => {
    const domNode = editor.getDomNode();
    if (!domNode) return;

    // ── Layer 1: block Ctrl+V / Cmd+V at the DOM keydown level ──────────────
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isPasteShortcut = (e.ctrlKey || e.metaKey) && e.key === 'v';
      if (!isPasteShortcut) return;

      // Try reading clipboard text to check length BEFORE paste happens
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText.length > MAX_PASTE_CHARS) {
          e.preventDefault();           // stop Monaco from inserting anything
          e.stopImmediatePropagation();
          setPasteBlocks(p => p + 1);
          if (participantId) {
            try {
              supabase.from('cheat_logs').insert({
                participant_id: participantId,
                event_type: 'large_paste_blocked',
                detail: `Ctrl+V blocked — attempted ${clipText.length} chars`,
                occurred_at: new Date().toISOString(),
              }).then(() => {});
            } catch (_) {}
          }
          fireToast(`🚫 Paste blocked! You tried to paste ${clipText.length} characters. Max allowed is ${MAX_PASTE_CHARS}. Type your code manually.`);
        }
        // If <= MAX_PASTE_CHARS → allow the paste through normally
      } catch (_) {
        // Clipboard API blocked by browser (e.g. no permission) — fall through
        // to Layer 2 (onDidPaste) as backup
      }
    };

    // Use capture=true so this runs before Monaco's own keydown handler
    domNode.addEventListener('keydown', handleKeyDown, true);

    // ── Layer 2: onDidPaste — catches drag-drop / right-click pastes ─────────
    editor.onDidPaste((e: any) => {
      const model = editor.getModel();
      if (!model) return;
      const pastedText = model.getValueInRange(e.range);
      if (pastedText.length > MAX_PASTE_CHARS) {
        // Undo immediately — text was inserted but we revert it
        editor.trigger('keyboard', 'undo', null);
        setPasteBlocks(p => p + 1);
        if (participantId) {
          try {
            supabase.from('cheat_logs').insert({
              participant_id: participantId,
              event_type: 'large_paste_blocked',
              detail: `Drag/right-click paste blocked — ${pastedText.length} chars`,
              occurred_at: new Date().toISOString(),
            }).then(() => {});
          } catch (_) {}
        }
        fireToast(`🚫 Paste blocked! ${pastedText.length} characters pasted. Max allowed is ${MAX_PASTE_CHARS}. Type your code manually.`);
      }
    });
  }, [participantId, fireToast]);


  // ─── Run / Submit ──────────────────────────────────────────────────────────
  async function handleRun() {
    const pid = participantId || JSON.parse(localStorage.getItem(`participant_${slug}`) || '{}').id;
    if (!selectedProblem || isExpired || !isLive || !pid) return;
    setRunning(true); setRunResult(null);
    try {
      const res = await fetch('/api/judge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: pid, problem_id: selectedProblem.id, language, code, mode: 'run' }),
      });
      setRunResult(await res.json());
    } catch { setRunResult({ verdict: 'error', output: 'Network error' }); }
    setRunning(false);
  }

  async function handleSubmit() {
    const pid = participantId || JSON.parse(localStorage.getItem(`participant_${slug}`) || '{}').id;
    if (!selectedProblem || isExpired || !isLive || !pid) return;
    setSubmitting(true); setSubmitResult(null);
    try {
      const res = await fetch('/api/judge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: pid, problem_id: selectedProblem.id, language, code, mode: 'submit' }),
      });
      const result = await res.json();
      setSubmitResult(result);
      if (result.verdict) {
        setVerdicts(prev => {
          const cur = prev[selectedProblem.id];
          if (result.verdict === 'AC' || !cur) return { ...prev, [selectedProblem.id]: result.verdict };
          return prev;
        });
      }
    } catch { setSubmitResult({ verdict: 'error', output: 'Network error' }); }
    setSubmitting(false);
  }

  // ─── Render: loading ───────────────────────────────────────────────────────
  if (!contest) return <LoadingScreen />;

  // ─── Render: blocked screen (shown after 3rd switch) ──────────────────────
  if (isBlocked) return <BlockedScreen slug={slug} />;

  // ─── Render: blocking in progress ─────────────────────────────────────────
  if (blockingInProgress) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, background: 'var(--bg-primary)' }}>
      <div className="spinner" style={{ width: 48, height: 48 }} />
      <p style={{ color: 'var(--red)', fontWeight: 700, fontSize: 18 }}>Processing disqualification…</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ══ Navbar ═══════════════════════════════════════════════════════════ */}
      <nav className="navbar" style={{ flexShrink: 0 }}>
        <div className="navbar-brand">
          <Link href="/" className="btn btn-ghost btn-sm" style={{ marginRight: 8, padding: '6px 10px', minWidth: 'auto' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div className="logo-icon">⚡</div>
          <span className="hide-mobile">{contest.title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab-switch counter badge */}
          {tabSwitches > 0 && (
            <div
              onClick={() => setShowWarnModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                background: tabSwitches >= BLOCK_AT - 1 ? 'var(--red-bg)' : '#fffbeb',
                border: `1px solid ${tabSwitches >= BLOCK_AT - 1 ? 'var(--red)' : '#f59e0b'}`,
                color: tabSwitches >= BLOCK_AT - 1 ? 'var(--red)' : '#92400e',
                padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                fontSize: 12, fontWeight: 700,
                animation: tabSwitches >= BLOCK_AT - 1 ? 'timerPulse 1s infinite' : 'none',
              }}
              title="Click to view warning"
            >
              ⚠️ {tabSwitches}/{BLOCK_AT - 1} switch{tabSwitches !== 1 ? 'es' : ''} — {BLOCK_AT - 1 - tabSwitches <= 0 ? 'LAST WARNING!' : `${BLOCK_AT - 1 - tabSwitches} left`}
            </div>
          )}

          {/* Paste-block counter badge */}
          {pasteBlocks > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#fdf4ff', border: '1px solid #a855f7',
              color: '#7c3aed', padding: '4px 10px',
              borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700,
            }}>
              🚫 {pasteBlocks} paste{pasteBlocks > 1 ? 's' : ''} blocked
            </div>
          )}

          <div className={`timer ${isDanger ? 'danger' : ''}`}>
            {isDanger ? <span>🔴</span> : <span>⏱</span>}
            <span>{timeLeft || '...'}</span>
          </div>
          <a href={`/contest/${slug}/leaderboard`} target="_blank" className="btn btn-ghost btn-sm">🏆 Board</a>
        </div>
      </nav>

      {/* ══ Anti-paste toast ════════════════════════════════════════════════ */}
      <div className={`anticheat-toast ${showToast ? 'visible' : ''}`}>{toastMsg}</div>

      {/* ══ Warning Modal (switch 1 or 2) ═══════════════════════════════════ */}
      {showWarnModal && (
        <div className="anticheat-overlay" onClick={() => setShowWarnModal(false)}>
          <div className="anticheat-modal" onClick={e => e.stopPropagation()}>
            {/* Animated icon */}
            <div className="anticheat-modal-icon warn">⚠️</div>

            <h2 className="anticheat-modal-title">
              {warnSwitchNum === BLOCK_AT - 1 ? '🚨 FINAL WARNING' : '⚠️ Tab Switch Detected'}
            </h2>

            <p className="anticheat-modal-body">
              {warnSwitchNum === BLOCK_AT - 1
                ? `This is your LAST warning! You have switched tabs ${warnSwitchNum} time${warnSwitchNum > 1 ? 's' : ''}. If you switch again, you will be immediately disqualified and your score will be set to ZERO.`
                : `You switched away from the contest window. This has been recorded. You have ${BLOCK_AT - 1 - warnSwitchNum} warning${BLOCK_AT - 1 - warnSwitchNum !== 1 ? 's' : ''} remaining before you are disqualified.`
              }
            </p>

            {/* Stats row */}
            <div className="anticheat-modal-stats">
              <div className="anticheat-stat">
                <span className="anticheat-stat-val" style={{ color: 'var(--red)' }}>{warnSwitchNum}</span>
                <span className="anticheat-stat-label">Switches Used</span>
              </div>
              <div className="anticheat-stat">
                <span className="anticheat-stat-val" style={{ color: warnSwitchNum >= BLOCK_AT - 1 ? 'var(--red)' : 'var(--yellow)' }}>
                  {BLOCK_AT - 1 - warnSwitchNum <= 0 ? 0 : BLOCK_AT - 1 - warnSwitchNum}
                </span>
                <span className="anticheat-stat-label">Warnings Left</span>
              </div>
              <div className="anticheat-stat">
                <span className="anticheat-stat-val">{BLOCK_AT}</span>
                <span className="anticheat-stat-label">Blocks At</span>
              </div>
            </div>

            {/* Consequence box */}
            <div style={{
              background: warnSwitchNum >= BLOCK_AT - 1 ? 'var(--red-bg)' : '#fffbeb',
              border: `1px solid ${warnSwitchNum >= BLOCK_AT - 1 ? 'var(--red)' : '#f59e0b'}`,
              borderRadius: 'var(--radius-sm)', padding: '12px 14px',
              fontSize: 13, fontWeight: 600,
              color: warnSwitchNum >= BLOCK_AT - 1 ? 'var(--red)' : '#78350f',
              marginBottom: 20, textAlign: 'left',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{warnSwitchNum >= BLOCK_AT - 1 ? '🚨' : 'ℹ️'}</span>
              <span>
                {warnSwitchNum >= BLOCK_AT - 1
                  ? 'ONE MORE tab switch will permanently disqualify you. Your score will be zeroed and you will be removed from the contest.'
                  : 'Every tab switch is recorded. Stay on this page for the entire duration of the contest.'}
              </span>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', fontSize: 15, padding: '12px' }}
              onClick={() => setShowWarnModal(false)}
            >
              I Understand — Return to Contest
            </button>
          </div>
        </div>
      )}

      {/* ══ Contest expired banner ═══════════════════════════════════════════ */}
      {isExpired && (
        <div style={{ background: 'var(--red-bg)', borderBottom: '1px solid var(--red)', padding: '10px 24px', textAlign: 'center', color: 'var(--red)', fontWeight: 700, flexShrink: 0 }}>
          🔴 Contest has ended. No more submissions accepted.
        </div>
      )}

      {/* ══ Main Layout ══════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{ width: 220, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '12px 0', flexShrink: 0 }}>
          <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
            Problems
          </div>
          {problems.map((p, i) => {
            const v = verdicts[p.id];
            const isSelected = selectedProblem?.id === p.id;
            return (
              <button key={p.id} onClick={() => setSelectedProblem(p)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px',
                background: isSelected ? 'var(--bg-hover)' : 'transparent',
                borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13, transition: 'all 0.15s',
              }}>
                <div className={`problem-status ${v === 'AC' ? 'ac' : v ? 'wa' : 'pending'}`} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>P{i + 1}. {p.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.points} pts</div>
                </div>
              </button>
            );
          })}
          {problems.length === 0 && (
            <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 13 }}>No problems yet</div>
          )}
        </aside>

        {/* Problem statement */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, minWidth: 0 }}>
          {selectedProblem
            ? <ProblemStatement problem={selectedProblem} />
            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Select a problem from the sidebar</div>
          }
        </div>

        {/* Editor panel */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', minWidth: 0 }}>

          {/* Toolbar */}
          <div className="editor-toolbar" style={{ flexShrink: 0 }}>
            <select
              className="select" value={language}
              onChange={e => setLanguage(e.target.value as Language)}
              style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
              disabled={isExpired}
            >
              {(Object.keys(LANGUAGE_CONFIG) as Language[]).map(l => (
                <option key={l} value={l}>{LANGUAGE_CONFIG[l].label}</option>
              ))}
            </select>

            {/* Paste policy pill */}
            <div title={`Paste limited to ${MAX_PASTE_CHARS} characters at once`} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              padding: '3px 8px', borderRadius: 'var(--radius-sm)', userSelect: 'none',
            }}>
              🔒 Paste ≤{MAX_PASTE_CHARS}c
            </div>

            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={handleRun} disabled={running || submitting || isExpired || !selectedProblem}>
                {running ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Running…</> : '▶ Run'}
              </button>
              <button className="btn btn-success btn-sm" onClick={handleSubmit} disabled={submitting || running || isExpired || !participantId || !selectedProblem}>
                {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Judging…</> : '✔ Submit'}
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
              onMount={handleEditorMount}
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
          <div style={{ padding: 12, borderTop: '1px solid var(--border)', maxHeight: 220, overflowY: 'auto', flexShrink: 0 }}>
            {runResult && (
              <div className={`result-box ${runResult.verdict === 'AC' ? 'ac' : runResult.verdict === 'error' ? 'error' : 'wa'}`}>
                <strong>Sample Test: {runResult.verdict === 'AC' ? '✅ Passed' : runResult.verdict === 'CE' ? '⚠️ Compile Error' : runResult.verdict === 'error' ? '⚠️ Error' : '❌ Wrong Answer'}</strong>
                {runResult.runtime_ms != null && <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.8 }}>{runResult.runtime_ms}ms</span>}
                {runResult.input    && runResult.verdict !== 'AC' && <pre style={{ marginTop: 8, opacity: 0.7 }}>Input:\n{runResult.input}</pre>}
                {runResult.output   && <pre style={{ marginTop: 8 }}>{runResult.verdict === 'AC' ? runResult.output.slice(0, 800) : `Got:\n${runResult.output.slice(0, 800)}`}</pre>}
                {runResult.expected && runResult.verdict !== 'AC' && <pre style={{ marginTop: 8, opacity: 0.7 }}>Expected:\n{runResult.expected}</pre>}
              </div>
            )}
            {submitResult && (
              <div className={`result-box ${submitResult.verdict === 'AC' ? 'ac' : submitResult.verdict === 'error' ? 'error' : 'wa'}`} style={{ marginTop: runResult ? 8 : 0 }}>
                <strong>
                  {submitResult.verdict === 'AC'    && `✅ Accepted — ${submitResult.score} pts`}
                  {submitResult.verdict === 'WA'    && `❌ Wrong Answer (${submitResult.passed}/${submitResult.total} passed)`}
                  {submitResult.verdict === 'TLE'   && `⏰ Time Limit Exceeded`}
                  {submitResult.verdict === 'CE'    && `⚠️ Compile Error`}
                  {submitResult.verdict === 'RE'    && `💥 Runtime Error`}
                  {submitResult.verdict === 'error' && `⚠️ Judge Error`}
                </strong>
                {submitResult.runtime_ms != null && <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.8 }}>Total runtime: {submitResult.runtime_ms}ms</span>}
                {submitResult.output && <pre>{submitResult.output.slice(0, 800)}</pre>}
              </div>
            )}
            {!runResult && !submitResult && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Run your code against sample input, or Submit to judge against all test cases.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Blocked screen (shown after 3rd tab switch) ──────────────────────────────
function BlockedScreen({ slug }: { slug: string }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
      background: 'linear-gradient(135deg, #fff1f2 0%, #fef2f2 100%)',
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: '52px 44px',
        maxWidth: 520, width: '100%', textAlign: 'center',
        boxShadow: '0 24px 80px rgba(220,38,38,0.15)',
        border: '2px solid #fca5a5',
        animation: 'popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}>
        {/* Icon */}
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'var(--red-bg)', border: '3px solid var(--red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', fontSize: 48,
          animation: 'pulse-red 1.5s ease infinite',
        }}>
          🚫
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--red)', marginBottom: 12, letterSpacing: '-0.5px' }}>
          You Have Been Disqualified
        </h1>

        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.8, marginBottom: 28 }}>
          You switched away from the contest window <strong style={{ color: 'var(--red)' }}>{BLOCK_AT} times</strong>,
          which violates the contest integrity rules.
        </p>

        {/* Reason box */}
        <div style={{
          background: 'var(--red-bg)', border: '1px solid #fca5a5',
          borderRadius: 12, padding: '18px 20px', marginBottom: 28,
          textAlign: 'left',
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
            Reason for Disqualification
          </div>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              `Tab switched ${BLOCK_AT} times during the contest`,
              'All your submission scores have been set to 0',
              'Your account has been flagged for admin review',
              'You cannot re-enter this contest',
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
                <span style={{ marginTop: 1, flexShrink: 0 }}>✗</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Tab Switches', val: BLOCK_AT, color: 'var(--red)' },
            { label: 'Your Score', val: '0', color: 'var(--red)' },
            { label: 'Status', val: 'DQ', color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: 10, padding: '14px 8px',
            }}>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Back button */}
        <a
          href={`/contest/${slug}`}
          className="btn btn-danger"
          style={{ display: 'block', width: '100%', textAlign: 'center', padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 12, textDecoration: 'none' }}
        >
          ← Return to Contest Page
        </a>
        <p style={{ marginTop: 14, fontSize: 12, color: '#9ca3af' }}>
          If you believe this is a mistake, please contact the admin.
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ProblemStatement({ problem }: { problem: Problem }) {
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>{problem.title}</h1>
          <span style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(108,99,255,0.3)', padding: '3px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
            {problem.points} pts
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>⏱ Time Limit: {problem.time_limit_ms}ms</span>
        </div>
      </div>
      <Section title="Problem Statement">
        <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{problem.statement}</div>
      </Section>
      {problem.input_format  && <Section title="Input Format"><div  style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.8 }}>{problem.input_format}</div></Section>}
      {problem.output_format && <Section title="Output Format"><div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.8 }}>{problem.output_format}</div></Section>}
      {problem.constraints   && <Section title="Constraints"><div   style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, lineHeight: 1.8 }}>{problem.constraints}</div></Section>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Sample Input</div>
          <pre style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-primary)' }}>{problem.sample_input || 'N/A'}</pre>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Sample Output</div>
          <pre style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-primary)' }}>{problem.sample_output || 'N/A'}</pre>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>{title}</h2>
      {children}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 36, height: 36, marginBottom: 16 }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading contest…</p>
      </div>
    </div>
  );
}
