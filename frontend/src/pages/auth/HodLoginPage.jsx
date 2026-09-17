import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function HodLoginPage({ onBackHome }) {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!adminId.trim() || !password) {
      setError('Please enter both Admin ID and password.');
      return;
    }

    try {
      setLoading(true);
      const loggedUser = await login(adminId, password);
      if (loggedUser.role !== 'admin') {
        setError('This account does not have HOD Admin privileges.');
      }
    } catch (err) {
      setError(err.message || 'Invalid HOD credentials. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hod-ref-root">
      {/* 1. TOP NAVBAR WITH BACK TO HOME BUTTON */}
      <header className="ref-header">
        <div className="ref-header-left" onClick={onBackHome} style={{ cursor: onBackHome ? 'pointer' : 'default' }}>
          <span className="ref-header-cap">🎓</span>
          <div>
            <h1 className="ref-header-title">
              Achieve<span>IT</span>
            </h1>
            <p className="ref-header-dept">Department of Information Technology</p>
          </div>
        </div>
        <div className="ref-header-right">
          {onBackHome && (
            <button onClick={onBackHome} className="ref-back-home-btn" type="button">
              ← Back to Home
            </button>
          )}
          <span>Empower</span>
          <span className="divider">|</span>
          <span>Achieve</span>
          <span className="divider">|</span>
          <span>Grow</span>
        </div>
      </header>

      {/* 2. BACKGROUND DECORATIONS */}
      <div className="ref-decor-arc-topleft"></div>
      <div className="ref-decor-dots-topright"></div>
      <div className="ref-decor-dots-left"></div>
      <div className="ref-decor-arc-right"></div>

      {/* 3. MAIN CENTERED CONTAINER */}
      <main className="hod-main-container">
        {/* HERO TITLE */}
        <div className="hod-hero">
          <p className="hod-hero-track">I T &nbsp; D E P A R T M E N T &nbsp; • &nbsp; A D M I N &nbsp; P O R T A L</p>
          <h2 className="hod-hero-title">
            Welcome, <span>HOD</span>
          </h2>
          <p className="hod-hero-sub">Sign in to manage your department achievements</p>
          <div className="ref-hero-line"></div>
        </div>

        {/* CARD CONTAINER WITH FLOATING SIDE ELEMENTS */}
        <div className="hod-card-wrapper">
          {/* 7. LEFT FLOATING CARD */}
          <div className="hod-floating-card hod-left-card">
            <div className="hod-analytics-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <p className="hod-card-text">
              Data Driven<br />
              Decisions.<br />
              Stronger<br />
              Departments.
            </p>
            <div className="hod-card-line"></div>
          </div>

          {/* 4. & 5. CENTER HOD LOGIN CARD */}
          <div className="hod-login-card">
            {/* Circular Building Icon */}
            <div className="hod-icon-circle-wrapper">
              <div className="hod-icon-circle">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9.5L12 3L21 9.5H3Z"></path>
                  <line x1="4" y1="10" x2="4" y2="18"></line>
                  <line x1="9" y1="10" x2="9" y2="18"></line>
                  <line x1="15" y1="10" x2="15" y2="18"></line>
                  <line x1="20" y1="10" x2="20" y2="18"></line>
                  <line x1="2" y1="18" x2="22" y2="18"></line>
                  <line x1="1" y1="21" x2="23" y2="21"></line>
                </svg>
              </div>
            </div>

            <div className="ref-card-badge-row">
              <span className="ref-card-badge">HOD ADMIN PORTAL</span>
            </div>

            <h3 className="ref-card-heading">HOD Login</h3>
            <p className="ref-card-subheading">Authorized department administration access</p>

            {error && <div className="ref-error-banner">{error}</div>}

            <form onSubmit={handleSubmit} className="ref-form">
              {/* Admin ID Field */}
              <div className="ref-field-group">
                <label className="ref-field-label">College ID / Admin ID</label>
                <div className="ref-input-container">
                  <span className="ref-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="ref-input-element"
                    placeholder="Enter your HOD ID"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="ref-field-group">
                <label className="ref-field-label">Password</label>
                <div className="ref-input-container">
                  <span className="ref-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="ref-input-element"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="ref-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="ref-submit-btn" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In to Admin Portal →'}
              </button>
            </form>

            {/* Shield Footer */}
            <div className="hod-security-divider">
              <span className="hod-divider-line"></span>
              <div className="hod-shield-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>Authorized HOD access only</span>
              </div>
              <span className="hod-divider-line"></span>
            </div>
          </div>

          {/* 8. RIGHT FLOATING CARD */}
          <div className="hod-floating-card hod-right-card">
            <span className="ref-quote-mark">“</span>
            <p className="hod-card-text">
              Leading People.<br />
              Enabling Talent.<br />
              Building Tomorrow.
            </p>
            <div className="hod-card-line"></div>
          </div>
        </div>

        {/* 10. BOTTOM CENTER CAPABILITY ROW */}
        <div className="hod-capability-container">
          <div className="hod-capability-row">
            <div className="hod-cap-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>Manage</span>
            </div>
            <span className="divider">|</span>
            <div className="hod-cap-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="12 2 12 12 19.07 19.07"></polygon>
              </svg>
              <span>Analyze</span>
            </div>
            <span className="divider">|</span>
            <div className="hod-cap-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>Report</span>
            </div>
          </div>
          <small className="hod-cap-subtext">Department Administration</small>
        </div>
      </main>

      {/* 9. LOWER-LEFT ILLUSTRATION & TEXT */}
      <div className="ref-lower-left">
        <svg className="ref-building-svg" viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M120 15 C105 15, 100 35, 100 45 L140 45 C140 35, 135 15, 120 15 Z" stroke="#93C5FD" strokeWidth="1.8" fill="none"/>
          <line x1="120" y1="5" x2="120" y2="15" stroke="#93C5FD" strokeWidth="1.8"/>
          <polygon points="80,45 160,45 120,32" stroke="#93C5FD" strokeWidth="1.8" fill="none"/>
          <line x1="75" y1="46" x2="165" y2="46" stroke="#93C5FD" strokeWidth="1.8"/>
          <line x1="90" y1="46" x2="90" y2="90" stroke="#93C5FD" strokeWidth="1.5"/>
          <line x1="105" y1="46" x2="105" y2="90" stroke="#93C5FD" strokeWidth="1.5"/>
          <line x1="120" y1="46" x2="120" y2="75" stroke="#93C5FD" strokeWidth="1.5"/>
          <line x1="135" y1="46" x2="135" y2="90" stroke="#93C5FD" strokeWidth="1.5"/>
          <line x1="150" y1="46" x2="150" y2="90" stroke="#93C5FD" strokeWidth="1.5"/>
          <path d="M112 90 L112 75 C112 70, 128 70, 128 75 L128 90" stroke="#93C5FD" strokeWidth="1.5"/>
          <rect x="25" y="55" width="55" height="35" stroke="#93C5FD" strokeWidth="1.8" fill="none"/>
          <line x1="20" y1="55" x2="80" y2="55" stroke="#93C5FD" strokeWidth="1.8"/>
          <rect x="35" y="65" width="10" height="15" stroke="#93C5FD" strokeWidth="1.2"/>
          <rect x="55" y="65" width="10" height="15" stroke="#93C5FD" strokeWidth="1.2"/>
          <rect x="160" y="55" width="55" height="35" stroke="#93C5FD" strokeWidth="1.8" fill="none"/>
          <line x1="160" y1="55" x2="220" y2="55" stroke="#93C5FD" strokeWidth="1.8"/>
          <rect x="175" y="65" width="10" height="15" stroke="#93C5FD" strokeWidth="1.2"/>
          <rect x="195" y="65" width="10" height="15" stroke="#93C5FD" strokeWidth="1.2"/>
          <line x1="10" y1="90" x2="230" y2="90" stroke="#93C5FD" strokeWidth="2"/>
          <line x1="5" y1="95" x2="235" y2="95" stroke="#93C5FD" strokeWidth="1.5"/>
        </svg>
        <div className="ref-lower-left-text">
          <span>DEPARTMENT OF</span>
          <strong>INFORMATION TECHNOLOGY</strong>
          <div className="ref-dept-underline"></div>
        </div>
      </div>

      {/* 11. LOWER-RIGHT SCRIPT TEXT */}
      <div className="ref-lower-right">
        <span className="ref-script-line">Stronger Departments</span>
        <span className="ref-script-line">Brighter Futures</span>
        <svg className="ref-script-swoosh" viewBox="0 0 160 20" fill="none">
          <path d="M5 12 Q 80 20, 155 5" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}