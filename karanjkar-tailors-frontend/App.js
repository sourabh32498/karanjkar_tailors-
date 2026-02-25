import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import api, { AUTH_TOKEN_KEY, AUTH_USER_KEY, getApiError } from "./api";
import AddCustomer from "./components/AddCustomer";
import CustomerList from "./components/CustomerList";
import Orders from "./components/Orders";
import Measurment from "./components/Measurment";
import Dashboard from "./components/Dashboard";
import Billing from "./components/Billing";
import "./App.css";

const THEME_KEY = "kt_theme_v1";
const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "Home" },
  { to: "/customers", label: "Customers", shortLabel: "Customers" },
  { to: "/orders", label: "Orders", shortLabel: "Orders" },
  { to: "/measurements", label: "Measurements", shortLabel: "Measures" },
  { to: "/billing", label: "Billing", shortLabel: "Billing" }
];

function CustomersPage() {
  return (
    <>
      <AddCustomer />
      <CustomerList />
    </>
  );
}

function LoginPage({ onLogin, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError("Username and password are required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.post("/auth/login", {
        username: form.username.trim(),
        password: form.password
      });
      if (!res?.data?.success) {
        setError("Invalid login response. Please try again.");
        return;
      }
      const token = res?.data?.token;
      const user = res?.data?.user || { username: form.username.trim() };
      if (!token) {
        setError("Login token missing. Please check backend auth response.");
        return;
      }
      onLogin({ token, user });
      alert("Login successful");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiError(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap d-flex align-items-center justify-content-center">
      <div className="card auth-card shadow-sm">
        <div className="card-body p-4 p-md-5">
          <div className="d-flex justify-content-end mb-2">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onToggleTheme}>
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
          <h3 className="app-title mb-1">Karanjkar Tailors</h3>
          <p className="text-muted mb-4">Sign in to manage customers, orders, measurements, and billing.</p>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <form className="d-grid gap-3" onSubmit={submit}>
            <div>
              <label className="form-label">Username</label>
              <input
                className="form-control"
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AppLayout({ onLogout, username, theme, onToggleTheme }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const linkClass = ({ isActive }) =>
    `admin-nav-link nav-link d-flex flex-column align-items-start rounded-3 border px-3 py-2 ${
      isActive ? "active" : "text-body"
    }`;

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith("/billing")) return "Billing";
    if (location.pathname.startsWith("/customers")) return "Customers";
    if (location.pathname.startsWith("/orders")) return "Orders";
    if (location.pathname.startsWith("/measurements")) return "Measurements";
    return "Dashboard";
  }, [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <div className={`sidebar-backdrop ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className="container-fluid py-3 py-lg-4">
        <header className="mb-3 card section-card shadow-sm">
          <div className="card-body d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 py-3">
            <div>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm sidebar-toggle d-lg-none mb-2"
                onClick={() => setSidebarOpen(true)}
              >
                Menu
              </button>
              <h2 className="app-title mb-1">Karanjkar Tailors</h2>
              <p className="text-muted mb-0">Admin Dashboard - {pageTitle}</p>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onToggleTheme}>
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              <span className="badge text-bg-light border">Signed in: {username || "Admin"}</span>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="admin-layout">
          <aside className={`admin-sidebar card section-card shadow-sm ${sidebarOpen ? "open" : ""}`}>
            <div className="card-body p-0">
              <div className="admin-sidebar-head">
                <h6 className="mb-1">Admin Menu</h6>
                <small className="text-muted">Project modules</small>
              </div>
              <nav className="nav nav-pills flex-column gap-2 p-3">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} to={item.to} className={linkClass}>
                    <span className="fw-semibold">{item.label}</span>
                    <span className="small opacity-75">Manage {item.shortLabel}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>

          <main className="admin-main">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/measurements" element={<Measurment />} />
              <Route
                path="*"
                element={
                  <div className="card section-card shadow-sm">
                    <div className="card-body text-center py-5">
                      <h4 className="mb-2">Page Not Found</h4>
                      <p className="text-muted mb-3">The page you are looking for does not exist.</p>
                      <NavLink to="/dashboard" className="btn btn-primary">Go to Dashboard</NavLink>
                    </div>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [auth, setAuth] = useState(() => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const rawUser = localStorage.getItem(AUTH_USER_KEY);
      const user = rawUser ? JSON.parse(rawUser) : null;
      return token ? { token, user } : null;
    } catch (_err) {
      return null;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const setAuthState = (payload) => {
    setAuth(payload);
    if (payload) {
      localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload.user || null));
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
  };

  const onLogout = () => {
    setAuthState(null);
    alert("Logout successful");
  };
  const onToggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <Routes>
      <Route
        path="/login"
        element={
          auth ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onLogin={setAuthState} theme={theme} onToggleTheme={onToggleTheme} />
          )
        }
      />
      <Route
        path="/*"
        element={
          auth ? (
            <AppLayout
              onLogout={onLogout}
              username={auth?.user?.username}
              theme={theme}
              onToggleTheme={onToggleTheme}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
