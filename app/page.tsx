'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="logo-icon">⚡</div>
          <span>Decode to Code</span>
        </div>
        <Link href="/admin" className="btn btn-ghost btn-sm">Admin Panel</Link>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            🏆 PCCOE Presents
          </div>
          <h1>Decode to Code</h1>
          <p>
            A real-time DSA coding contest open to all college students.
            Solve algorithmic challenges, climb the live leaderboard, and prove your skills.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '32px 40px', maxWidth: 400, width: '100%' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Enter your contest link below, or share a contest link with participants.
              </p>
              <JoinForm />
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-num">4</div>
              <div className="stat-label">Languages</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">Live</div>
              <div className="stat-label">Leaderboard</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">PCCOE</div>
              <div className="stat-label">Organised by</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function JoinForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const slug = (e.currentTarget.elements.namedItem('slug') as HTMLInputElement).value.trim();
    if (slug) window.location.href = `/contest/${slug}`;
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="form-group">
        <label className="form-label">Contest Slug / Code</label>
        <input name="slug" className="input" placeholder="e.g. decode2code" required />
      </div>
      <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
        Join Contest →
      </button>
    </form>
  );
}
