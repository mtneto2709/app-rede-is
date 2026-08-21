import Constants from "expo-constants";
import { createContext, useContext, type ReactNode } from "react";
import { TenantTheme } from "@rede-is/theme-tokens";

/**
 * O tema do tenant é embutido no binário em tempo de build (via
 * `app.config.ts` -> `extra.theme`) — cada cliente tem seu próprio app, não
 * há troca de tema em runtime.
 */
const theme = TenantTheme.parse(Constants.expoConfig?.extra?.theme);
export const apiBaseUrl: string = Constants.expoConfig?.extra?.apiBaseUrl ?? "http://localhost:3000";

const ThemeContext = createContext<TenantTheme>(theme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): TenantTheme {
  return useContext(ThemeContext);
}
