'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const [eventName, setEventName] = useState('Professional DSA Arena');

  useEffect(() => {
    async function fetchEventName() {
      const { data } = await supabase.from('settings').select('*').eq('key', 'event_name').single();
      if (data) setEventName(data.value || 'Professional DSA Arena');
    }
    fetchEventName();
  }, []);

  return (
    <main className="bg-animate" style={{
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div className="floating-symbols">
        <div className="symbol">{'{ }'}</div>
        <div className="symbol">{'</>'}</div>
        <div className="symbol">{'++'}</div>
        <div className="symbol">{'[ ]'}</div>
        <div className="symbol">{'#'}</div>
        <div className="symbol">{'const'}</div>
        <div className="symbol">{'f()'}</div>
      </div>

      {/* Navbar */}
      <nav className="navbar" style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        zIndex: 100,
        flexShrink: 0,
        position: 'relative',
      }}>
        <div className="navbar-brand" style={{ color: 'var(--text-primary)' }}>
          <div className="logo-icon" style={{ background: 'var(--accent)', color: 'white' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-2 10h8L11 22l2-10H5L13 2Z"/></svg>
          </div>
          <span style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>DSA Arena</span>
        </div>
        <Link href="/admin" className="btn btn-ghost btn-sm" style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}>Admin Access</Link>
      </nav>

      {/* Hero — takes remaining height */}
      <section style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 2,
        padding: '12px 24px',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ width: '100%', maxWidth: 860, textAlign: 'center' }}>

          {/* Badge */}
          <div className="hero-badge" style={{
            background: 'rgba(37, 99, 235, 0.1)',
            color: '#1e293b',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            marginBottom: '12px',
            backdropFilter: 'blur(4px)',
            display: 'inline-flex',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            Professional Coding Series
          </div>

          {/* Title */}
          <h1 style={{
            color: '#0f172a',
            fontSize: 'clamp(32px, 5vw, 52px)',
            marginBottom: '10px',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
          }}>{eventName}</h1>

          {/* Subtitle */}
          <p style={{
            color: '#475569',
            marginBottom: '20px',
            maxWidth: '520px',
            fontSize: '16px',
            lineHeight: 1.5,
            margin: '0 auto 20px',
          }}>
            The ultimate algorithmic battlefield. Solve complex problems, track real-time results, and climb the leaderboard.
          </p>

          {/* Join Contest Card */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{
              maxWidth: 420,
              width: '100%',
              textAlign: 'left',
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 20px 50px -12px rgba(0,0,0,0.15)',
              padding: '24px 28px',
            }}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', color: 'var(--text-primary)' }}>Join Contest</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Enter your contest code to enter the arena.
                </p>
              </div>
              <JoinForm />
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '14px',
            maxWidth: 420,
            margin: '0 auto',
          }}>
            {[
              { val: '4+', lab: 'Languages' },
              { val: 'LIVE', lab: 'Board' },
              { val: 'DSA', lab: 'Focused' },
            ].map(({ val, lab }) => (
              <div key={lab} style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '14px 10px',
                boxShadow: 'var(--shadow)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent)', marginBottom: '2px' }}>{val}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{lab}</div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </main>
  );
}

function JoinForm() {
  const [slug, setSlug] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug.trim()) window.location.href = `/contest/${slug.trim()}`;
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="form-group">
        <label className="form-label">Contest Code</label>
        <input
          className="input font-mono"
          placeholder="e.g. spring-dsa-2025"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary btn-lg pulse" style={{ width: '100%' }}>
        Join Arena →
      </button>
    </form>
  );
}
