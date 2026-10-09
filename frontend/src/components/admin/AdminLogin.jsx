import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import Icon from "../ui/Icon.jsx";

export default function AdminLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card admin-login" onSubmit={handleSubmit}>
      <div>
        <span className="admin-login__icon">
          <Icon name="lock" size={22} />
        </span>
        <h2>Administrator sign in</h2>
        <p className="hint">
          This inbox holds passwords and identification photographs. Enter the
          Foundation email and password to continue.
        </p>
      </div>

      {error && (
        <p className="alert alert--error" role="alert">
          <span className="alert__icon">
            <Icon name="shield" size={17} />
          </span>
          <span>{error}</span>
        </p>
      )}

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@foundation.org"
          autoComplete="username"
          autoFocus
          required
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />
      </label>

      <button
        type="submit"
        className="btn btn--primary btn--block"
        disabled={busy || !email || !password}
      >
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" /> Signing in
          </>
        ) : (
          <>
            <Icon name="lock" size={16} /> Sign in
          </>
        )}
      </button>

      <p className="hint">
        <Icon name="shield" size={13} />
        Set <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code> in{" "}
        <code>backend/.env</code>. Both are required — if either is missing the
        inbox rejects every sign-in.
      </p>
    </form>
  );
}
