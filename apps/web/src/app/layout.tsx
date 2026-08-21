import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { themeToCssVariables } from "@rede-is/theme-tokens";
import { getCurrentTenantTheme } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getCurrentTenantTheme();
  return {
    title: theme.branding.appName,
    description: `Portal do cidadão — ${theme.displayName}`,
    icons: { icon: theme.branding.faviconUrl },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = await getCurrentTenantTheme();
  const cssVars = themeToCssVariables(theme);

  return (
    <html lang="pt-BR" style={cssVars as CSSProperties}>
      <body className="font-sans min-h-screen bg-app text-text-primary">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
