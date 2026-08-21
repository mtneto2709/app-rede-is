import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "@/theme/theme-provider";
import { authApi } from "./api-client";

interface AuthContextValue {
  accessToken: string | null;
  isLoading: boolean;
  setAccessToken: (token: string | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authApi
      .refresh(theme.slug)
      .then((result) => {
        if (!cancelled && result?.accessToken) setAccessToken(result.accessToken);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [theme.slug]);

  const logout = async () => {
    if (accessToken) await authApi.logout(theme.slug, accessToken);
    setAccessToken(null);
  };

  const value = useMemo(() => ({ accessToken, isLoading, setAccessToken, logout }), [accessToken, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
