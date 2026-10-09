/**
 * Admin session state: sign in, restore the token on reload, sign out.
 * The token lives in sessionStorage, so closing the tab signs the admin out.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { checkSession, getToken, login as apiLogin, setToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [status, setStatus] = useState("checking"); // checking | out | in

  // Validate whatever token survived a page reload.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus("out");
      return undefined;
    }
    checkSession(token)
      .then(() => !cancelled && setStatus("in"))
      .catch(() => {
        setToken("");
        if (!cancelled) setStatus("out");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signIn = useCallback(async (email, password) => {
    const result = await apiLogin(email, password);
    setTokenState(result.token);
    setStatus("in");
    return result;
  }, []);

  const signOut = useCallback(() => {
    setToken("");
    setTokenState("");
    setStatus("out");
  }, []);

  const value = useMemo(
    () => ({ token, status, signIn, signOut, isAuthenticated: status === "in" }),
    [token, status, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}