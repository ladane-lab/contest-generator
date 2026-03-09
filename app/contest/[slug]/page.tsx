'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Contest } from '@/lib/types';

export default function ContestJoinPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [joining, setJoining] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [contestStatus, setContestStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');

  useEffect(() => {
    // Check if already joined
    const stored = localStorage.getItem(`participant_${slug}`);
    if (stored) {
      const p = JSON.parse(stored);
      router.replace(`/contest/${slug}/problems?pid=${p.id}`);
    }
  }, [slug, router]);

  useEffect(() => {
    async function fetchContest() {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error || !data) {
        setError('Contest not found. Check the link and try again.');
      } else {
        setContest(data);
      }
      setLoading(false);
    }
    fetchContest();
  }, [slug]);

  useEffect(() => {
    if (!contest) return;
    const tick = () => {
      const now = Date.now();
      const start = new Date(contest.start_time).getTime();
      const end = new Date(contest.end_time).getTime();
      if (now < start) {
        setContestStatus('upcoming');
        const diff = start - now;
        setTimeLeft(formatDuration(diff));
      } else if (now >= start && now < end) {
        setContestStatus('live');
        const diff = end - now;
        setTimeLeft(formatDuration(diff));
      } else {
        setContestStatus('ended');
        setTimeLeft('0:00:00');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [contest]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !college.trim()) return;
    setJoining(true);
    const { data, error } = await supabase
      .from('participants')
      .insert({ contest_id: contest!.id, name: name.trim(), college: college.trim() })
      .select()
      .single();
    if (error || !data) {
      setError('Failed to join. Please try again.');
      setJoining(false);
      return;
    }
    localStorage.setItem(`participant_${slug}`, JSON.stringify({ id: data.id, name: data.name, college: data.college }));
    router.push(`/contest/${slug}/problems?pid=${data.id}`);
  }

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return (
    <main>
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="logo-icon">⚡</div>
          <span>Decode to Code</span>
        </div>
        <a href={`/contest/${slug}/leaderboard`} className="btn btn-ghost btn-sm">🏆 Leaderboard</a>
      </nav>

      <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(108,99,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 520, width: '100%', zIndex: 1 }}>
          {/* Contest Info */}
          <div className="card" style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏆</div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>{contest!.title}</h1>
            {contest!.description && (
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>{contest!.description}</p>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 16px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Starts: </span>
                <span style={{ fontWeight: 600 }}>{new Date(contest!.start_time).toLocaleString()}</span>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 16px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ends: </span>
                <span style={{ fontWeight: 600 }}>{new Date(contest!.end_time).toLocaleString()}</span>
              </div>
            </div>

            {/* Status Banner */}
            <div style={{ marginTop: '20px' }}>
              {contestStatus === 'upcoming' && (
                <div style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue)', borderRadius: 'var(--radius-sm)', padding: '14px', color: 'var(--blue)', fontWeight: 700 }}>
                  ⏳ Contest starts in &nbsp;<span className="font-mono">{timeLeft}</span>
                </div>
              )}
              {contestStatus === 'live' && (
                <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 'var(--radius-sm)', padding: '14px', color: 'var(--green)', fontWeight: 700 }}>
                  🟢 LIVE — Time remaining: <span className="font-mono">{timeLeft}</span>
                </div>
              )}
              {contestStatus === 'ended' && (
                <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: '14px', color: 'var(--red)', fontWeight: 700 }}>
                  🔴 Contest has ended
                </div>
              )}
            </div>
          </div>

          {/* Join Form */}
          {contestStatus !== 'ended' ? (
            <div className="card">
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Join the Contest</h2>
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Your Full Name</label>
                  <input className="input" placeholder="e.g. Arjun Sharma" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">College Name</label>
                  <input className="input" placeholder="e.g. PCCOE, MIT, VIT..." value={college} onChange={e => setCollege(e.target.value)} required />
                </div>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                  <span>💡</span>
                  <span>Languages allowed: <strong style={{ color: 'var(--text-primary)' }}>Python 3, C++17, C, Java 17</strong></span>
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={joining} style={{ width: '100%' }}>
                  {joining ? <><span className="spinner" /> Joining...</> : 'Join Contest →'}
                </button>
              </form>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>The contest is over. Check the final leaderboard!</p>
              <a href={`/contest/${slug}/leaderboard`} className="btn btn-primary btn-lg">View Final Leaderboard 🏆</a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <h2 style={{ marginBottom: '8px' }}>Contest Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{message}</p>
        <a href="/" className="btn btn-ghost">← Back to Home</a>
      </div>
    </div>
  );
}
