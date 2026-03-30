import { useState, useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import "../App.css";

export default function AppLayout() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <Link to="/" className="logo-link">
            <div className="logo">
              <span className="logo-icon">✦</span>
              <span className="logo-text">Planora AI</span>
            </div>
          </Link>
          <nav className="top-nav">
            <Link to="/">Plans</Link>
            <Link to="/actuals">Actuals</Link>
            <Link to="/coa" title="Chart of account">
              COA
            </Link>
          </nav>
        </div>
        <div className="topbar-right">
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle theme">
            {theme === "light" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            )}
          </button>
          {/* <div className="api-status connected">● API</div> */}
        </div>
      </header>

      <Outlet />
    </div>
  );
}
