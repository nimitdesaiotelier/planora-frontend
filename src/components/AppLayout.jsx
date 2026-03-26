import { Link, Outlet } from "react-router-dom";
import "../App.css";

export default function AppLayout() {
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
          {/* <div className="tagline">AI runs on the server — set OPENAI_API_KEY / GEMINI_API_KEY</div> */}
        </div>
        <div className="topbar-right">
          <div className="api-status connected">● API</div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
