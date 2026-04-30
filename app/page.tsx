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
    <main className="bg-animate" style={{ minHeight: '100vh', overflow: 'hidden', position: 'relative', backgroundColor: '#0f172a' }}>
      <div className="floating-symbols">
        <div className="symbol">{'{ }'}</div>
        <div className="symbol">{'</>'}</div>
        <div className="symbol">{'++'}</div>
        <div className="symbol">{'[ ]'}</div>
        <div className="symbol">{'#'}</div>
        <div className="symbol">{'const'}</div>
        <div className="symbol">{'f()'}</div>
      </div>

      <nav className="navbar" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="navbar-brand" style={{ color: 'var(--text-primary)' }}>
          <div className="logo-icon" style={{ background: 'var(--accent)', color: 'white' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-2 10h8L11 22l2-10H5L13 2Z"/></svg>
          </div>
          <span style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>DSA Arena</span>
        </div>
        <Link href="/admin" className="btn btn-ghost btn-sm" style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}>Admin Access</Link>
      </nav>

      <section className="hero" style={{ paddingTop: '60px', paddingBottom: '40px' }}>
        <div className="hero-content" style={{ position: 'relative', zIndex: 2 }}>
          <div className="hero-badge" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#1e293b', border: '1px solid rgba(37, 99, 235, 0.2)', marginBottom: '24px', backdropFilter: 'blur(4px)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            Professional Coding Series
          </div>
          <h1 style={{ color: '#0f172a', textShadow: 'none', fontSize: '56px', marginBottom: '16px', fontWeight: 900 }}>{eventName}</h1>
          <p style={{ color: '#475569', textShadow: 'none', marginBottom: '40px', maxWidth: '600px', fontSize: '18px', lineHeight: 1.6 }}>
            The ultimate algorithmic battlefield. Solve complex problems, track real-time results, and climb the leaderboard.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', position: 'relative' }}>
            <div className="card" style={{ maxWidth: 440, width: '100%', textAlign: 'left', background: 'white', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', padding: '32px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>Join Contest</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Enter your contest code to enter the arena.
                </p>
              </div>
              <JoinForm />
            </div>
          </div>

          <div className="stats-grid" style={{ marginTop: '48px', gap: '24px' }}>
            <div className="stat-card" style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow)' }}>
              <div className="stat-val" style={{ color: 'var(--accent)' }}>4+</div>
              <div className="stat-lab" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Languages</div>
            </div>
            <div className="stat-card" style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow)' }}>
              <div className="stat-val" style={{ color: 'var(--accent)' }}>LIVE</div>
              <div className="stat-lab" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Board</div>
            </div>
            <div className="stat-card" style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow)' }}>
              <div className="stat-val" style={{ color: 'var(--accent)' }}>DSA</div>
              <div className="stat-lab" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Focused</div>
            </div>
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
