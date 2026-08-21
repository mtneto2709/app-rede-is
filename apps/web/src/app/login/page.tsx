import { getCurrentTenantTheme } from "@/lib/theme";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const theme = await getCurrentTenantTheme();

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theme.branding.logoLightUrl} alt={theme.branding.appName} className="h-12 mx-auto" />
          <h1 className="text-xl font-semibold">{theme.branding.appName}</h1>
          <p className="text-sm text-text-secondary">Acesse seus atendimentos, agendamentos e documentos de saúde.</p>
        </div>
        <LoginForm socialProviders={theme.auth.socialProviders} otpChannels={theme.auth.otpChannels} />
      </div>
    </main>
  );
}
