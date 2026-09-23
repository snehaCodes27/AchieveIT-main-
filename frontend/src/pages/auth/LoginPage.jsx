import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage({ onNavigate, setCurrentPage }) {
  const { login } = useAuth();

  const [role, setRole] = useState('student');
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    // ⚡ Pre-warm backend and database connection pool as soon as login page opens
    fetch('https://achieveit-backend-4ffa.onrender.com/api/health', { mode: 'cors' }).catch(() => {});
  }, []);

  const handleBackHome = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('landing');
    } else if (typeof setCurrentPage === 'function') {
      setCurrentPage('landing');
    } else {
      window.location.href = '/';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedId = (collegeId || '').trim();

    if (!trimmedId) {
      setError(`Please enter your ${role === 'student' ? 'Student ID' : 'Faculty ID'}`);
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    let wakeTimer;
    try {
      setLoading(true);
      setIsWakingServer(false);
      wakeTimer = setTimeout(() => {
        setIsWakingServer(true);
      }, 2500);

      await login(trimmedId, password, role);

      const targetPage = role === 'teacher' ? 'teacher' : 'student';
      if (typeof onNavigate === 'function') {
        onNavigate(targetPage);
      } else if (typeof setCurrentPage === 'function') {
        setCurrentPage(targetPage);
      }
    } catch (err) {
      console.error('Login error:', err);
      const serverMsg = err.response?.data?.detail || err.response?.data?.message || err.message;
      setError(serverMsg || 'Invalid ID or Password. Please try again.');
    } finally {
      if (wakeTimer) clearTimeout(wakeTimer);
      setLoading(false);
      setIsWakingServer(false);
    }
  };

  return (
    <div className="ref-page-root">
      <div className="ref-decor-arc-topleft"></div>
      <div className="ref-decor-dots-topright"></div>
      <div className="ref-decor-dots-left"></div>
      <div className="ref-decor-arc-right"></div>

      <header className="ref-header">
        <div className="ref-header-left">
          <span className="ref-header-cap">🎓</span>
          <div>
            <h1 className="ref-header-title">Achieve<span>IT</span></h1>
            <p className="ref-header-dept">Department of Information Technology</p>
          </div>
        </div>
        <div className="ref-header-right">
          <button type="button" onClick={handleBackHome} className="ref-back-home-btn">
            ← Back to Home
          </button>
          <span>Portal Access</span>
          <span className="divider">|</span>
          <span>Help</span>
        </div>
      </header>

      <main className="ref-main-container">
        <div className="ref-hero">
          <span className="ref-hero-welcome">WELCOME TO</span>
          <h2 className="ref-hero-brand">Achieve<span>IT</span></h2>
          <p className="ref-hero-sub">Department Achievement Management System</p>
          <div className="ref-hero-line"></div>
        </div>

        <div className="ref-role-selector">
          <div
            className={`ref-role-card ${role === 'student' ? 'active' : ''}`}
            onClick={() => { setRole('student'); setError(''); }}
          >
            <div className="ref-role-icon-box">🎓</div>
            <div className="ref-role-text">
              <span className="ref-role-name">Student</span>
              <span className="ref-role-caption">Upload & track achievements</span>
            </div>
          </div>

          <div
            className={`ref-role-card ${role === 'teacher' ? 'active' : ''}`}
            onClick={() => { setRole('teacher'); setError(''); }}
          >
            <div className="ref-role-icon-box professor-box">👨‍🏫</div>
            <div className="ref-role-text">
              <span className="ref-role-name">Teacher / Faculty</span>
              <span className="ref-role-caption">Faculty profile & publications</span>
            </div>
          </div>
        </div>

        <div className="ref-login-section-wrapper">
          <div className="ref-floating-card ref-left-card">
            <div className="ref-cert-icon-wrapper">
              <span style={{ fontSize: '28px' }}>📜</span>
            </div>
            <p className="ref-card-text">Verified Academic Records</p>
          </div>

          <div className="ref-floating-card ref-right-card">
            <span className="ref-quote-mark">“</span>
            <p className="ref-card-text">Empowering IT Excellence</p>
            <div className="ref-quote-line"></div>
          </div>

          <div className="ref-login-card">
            <div className="ref-card-badge-row">
              <span className="ref-card-badge">
                {role === 'student' ? 'STUDENT PORTAL' : 'FACULTY PORTAL'}
              </span>
            </div>

            <h3 className="ref-card-heading">
              {role === 'student' ? 'Student Sign In' : 'Faculty Sign In'}
            </h3>
            <p className="ref-card-subheading">
              Enter your department credentials to access your dashboard
            </p>

            {error && (
              <div className="ref-error-banner">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="ref-form">
              <div className="ref-field-group">
                <label className="ref-field-label">
                  {role === 'student' ? 'Student ID / PRN' : 'Faculty ID / Email'}
                </label>
                <div className="ref-input-container">
                  <span className="ref-input-icon">👤</span>
                  <input
                    type="text"
                    placeholder={role === 'student' ? 'e.g. 2024DSIT012' : 'e.g. faculty@it.college.edu'}
                    value={collegeId}
                    onChange={(e) => setCollegeId(e.target.value)}
                    className="ref-input-element"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="ref-field-group">
                <label className="ref-field-label">Password</label>
                <div className="ref-input-container">
                  <span className="ref-input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ref-input-element"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ref-eye-btn"
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="ref-submit-btn"
              >
                {loading
                  ? (isWakingServer ? '⚡ Waking up server, please wait...' : 'Authenticating...')
                  : `Sign In as ${role === 'student' ? 'Student' : 'Faculty'} →`}
              </button>
            </form>

            <div className="ref-info-box">
              <span className="ref-info-icon">💡</span>
              <span>Default password for students is their <strong>Student ID</strong>.</span>
            </div>
          </div>
        </div>
      </main>

      <div className="ref-lower-left">
        <div className="ref-lower-left-text">
          <span>DEPARTMENT OF</span>
          <strong>INFORMATION TECHNOLOGY</strong>
          <div className="ref-dept-underline"></div>
        </div>
      </div>

      <div className="ref-lower-right">
        <span className="ref-script-line">Knowledge • Talent • Progress</span>
      </div>
    </div>
  );
}