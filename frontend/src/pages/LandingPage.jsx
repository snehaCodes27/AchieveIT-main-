import React from 'react';

export default function LandingPage({ onSelectPortal }) {
  return (
    <div className="landing-container">
      {/* 1. Slim & Compact Navbar with Large Icon */}
      <header className="landing-navbar">
        <div className="nav-brand">
          <div className="brand-logo">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#1e40af">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 19.94 8.13 22 12 22C15.87 22 19 19.94 19 17.18V13.18L12 17L5 13.18Z" />
            </svg>
          </div>
          <div className="brand-titles">
            <h2 className="brand-name">Achieve<span>IT</span></h2>
            <small className="brand-sub">Department of Information Technology</small>
          </div>
        </div>
      </header>

      {/* 2. Hero & Centered Portal Options */}
      <section className="hero-section">
        <div className="hero-badge">Official IT Department Portal</div>
        
        <h1 className="hero-title">
          Achieve<span>IT</span>
        </h1>
        
        <h3 className="hero-subtitle-clean">
          AI-Enabled Department Achievement Management System
        </h3>

        {/* 3. Centered Side-by-Side Portal Cards */}
        <div className="portal-cards-centered">
          {/* USER PORTAL */}
          <div className="minimal-portal-card" onClick={() => onSelectPortal('user')}>
            <div className="icon-circle">👥</div>
            <div className="card-titles">
              <h3>User Portal</h3>
              <span className="card-subtitle-tag">Students & Faculty</span>
            </div>
            <p className="card-short-desc">
              Submit and manage your achievements with ease.
            </p>
            <button className="minimal-btn-portal">
              Enter User Portal <span className="btn-arrow">→</span>
            </button>
          </div>

          {/* HOD ADMIN PORTAL */}
          <div className="minimal-portal-card admin-card-style" onClick={() => onSelectPortal('admin')}>
            <div className="icon-circle admin-icon-circle">🏛️</div>
            <div className="card-titles">
              <h3>HOD Admin Portal</h3>
              <span className="card-subtitle-tag admin-sub-tag">Department Management</span>
            </div>
            <p className="card-short-desc">
              Manage departmental achievements, users, and reports.
            </p>
            <button className="minimal-btn-portal admin-btn-style">
              Enter HOD Portal <span className="btn-arrow">→</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}