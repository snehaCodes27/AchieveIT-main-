import React from 'react';

export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo">🎓</div>
        <h1 className="splash-title">
          Achieve<span>IT</span>
        </h1>
        <p className="splash-subtitle">Department of Information Technology</p>
        
        <div className="splash-loader">
          <div className="splash-progress-bar">
            <div className="splash-progress-fill"></div>
          </div>
          <small className="splash-loading-text">Loading AI Models & Portal Data...</small>
        </div>
      </div>
    </div>
  );
}