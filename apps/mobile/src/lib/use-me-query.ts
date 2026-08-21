import { useEffect, useState } from "react";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "./auth-context";
import { fetchMe } from "./api-client";

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export function useMeQuery<T>(path: string): QueryState<T> {
  const theme = useTheme();
  const { accessToken, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<QueryState<T>>({ data: null, isLoading: true, error: null });

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) {
      setState({ data: null, isLoading: false, error: "Não autenticado" });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true }));

    fetchMe<T>(theme.slug, accessToken, path)
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, isLoading: false, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [path, accessToken, authLoading, theme.slug]);

  return state;
}
