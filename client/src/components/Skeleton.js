import React from 'react';

export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" style={{ width: '80%' }} />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
          <div className="skeleton skeleton-circle" />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            <div className="skeleton skeleton-text" style={{ width: '70%', height: 10 }} />
          </div>
          <div className="skeleton" style={{ width: 60, height: 24 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="stats-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="stat-card">
          <div className="skeleton skeleton-circle" />
          <div className="skeleton skeleton-text" style={{ width: '50%', marginTop: 12 }} />
          <div className="skeleton skeleton-title" style={{ width: '40%' }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
