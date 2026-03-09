'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Contest, Problem, LeaderboardEntry } from '@/lib/types';

export default function LeaderboardPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState('');
  const [isLive, setIsLive] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function fetchLeaderboard(contestId: string) {
    try {
      const res = await fetch(`/api/leaderboard?contest_id=${contestId}`);
      const data = await res.json();
      if (data.leaderboard) setEntries(data.leaderboard);
      if (data.problems) setProblems(data.problems);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      const { data: c } = await supabase.from('contests').select('*').eq('slug', slug).single();
      if (!c) return;
      setContest(c);
      await fetchLeaderboard(c.id);

      // Realtime subscription
      channelRef.current = supabase
        .channel(`lb_${c.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, () => {
          fetchLeaderboard(c.id);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants' }, () => {
          fetchLeaderboard(c.id);
        })
        .subscribe();
    }
    init();
    return () => { channelRef.current?.unsubscribe(); };
  }, [slug]);

  useEffect(() => {
    if (!contest) return;
    const tick = () => {
      const now = Date.now();
      const start = new Date(contest.start_time).getTime();
      const end = new Date(contest.end_time).getTime();
      if (now >= start && now < end) {
        setIsLive(true);
        const diff = end - now;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      } else if (now >= end) {
        setIsLive(false);
        setTimeLeft('Ended');
      } else {
        setIsLive(false);
        setTimeLeft('Upcoming');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [contest]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="logo-icon">⚡</div>
          <span>{contest?.title || 'Leaderboard'}</span>
        </div>
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-2" style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', fontSize: '13px', color: 'var(--green)', fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
              LIVE
            </div>
          )}
          <div className="timer" style={{ fontSize: '14px' }}>⏱ {timeLeft}</div>
          <a href={`/contest/${slug}`} className="btn btn-ghost btn-sm">← Back</a>
        </div>
      </nav>

      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>

      <div className="container" style={{ padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '4px' }}>🏆 Leaderboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {entries.length} participant{entries.length !== 1 ? 's' : ''} • Last updated: {lastUpdated || '...'}
              {isLive && ' • Auto-refreshing live'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            {entries.length > 0 && (
              <>
                <div className="stat-item">
                  <div className="stat-num" style={{ fontSize: '22px' }}>{entries.length}</div>
                  <div className="stat-label">Participants</div>
                </div>
                <div className="stat-item">
                  <div className="stat-num" style={{ fontSize: '22px' }}>{entries.filter(e => e.problems_solved > 0).length}</div>
                  <div className="stat-label">Solved ≥1</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
            Loading leaderboard...
          </div>
        ) : entries.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
            <h2 style={{ marginBottom: '8px' }}>No submissions yet</h2>
            <p style={{ color: 'var(--text-secondary)' }}>The leaderboard will update as participants submit solutions.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>College</th>
                    <th>Score</th>
                    <th>Solved</th>
                    {problems.map((p, i) => (
                      <th key={p.id} style={{ minWidth: 80 }}>P{i + 1}<br /><span style={{ fontWeight: 400, fontSize: '11px', textTransform: 'none' }}>{p.points}pts</span></th>
                    ))}
                    <th>Last Submit</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr key={entry.participant_id} className={`rank-${rank}`}>
                        <td className="rank-cell">
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{entry.name}</div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{entry.college}</td>
                        <td>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: '16px', color: 'var(--accent)' }}>{entry.total_score}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{entry.problems_solved}/{problems.length}</td>
                        {problems.map(p => {
                          const v = entry.problem_verdicts[p.id];
                          return (
                            <td key={p.id} style={{ textAlign: 'center' }}>
                              {v ? (
                                <span className={`badge badge-${v.verdict.toLowerCase()}`}>{v.verdict}</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>—</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                          {entry.last_submit_at ? new Date(entry.last_submit_at).toLocaleTimeString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
