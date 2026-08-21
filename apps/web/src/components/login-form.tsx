"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

type AuthChannel = "sms" | "whatsapp" | "email";
type SocialProvider = "google" | "apple";

const CHANNEL_LABELS: Record<AuthChannel, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "E-mail",
};

const FIRST_ACCESS_TOKEN_KEY = "rede_is_first_access_token";

export function LoginForm({
  socialProviders,
  otpChannels,
}: {
  socialProviders: SocialProvider[];
  otpChannels: AuthChannel[];
}) {
  const router = useRouter();
  const { setAccessToken } = useAuth();

  const [step, setStep] = useState<"contact" | "code">("contact");
  const [channel, setChannel] = useState<AuthChannel>(otpChannels[0] ?? "sms");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bff/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, contact }),
      });
      if (!res.ok) throw new Error("Não foi possível enviar o código. Verifique o contato informado.");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bff/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, contact, code }),
      });
      if (!res.ok) throw new Error("Código inválido ou expirado.");
      const data = await res.json();
      handleLoginResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLoginResult(data: { status: string; accessToken?: string; firstAccessToken?: string }) {
    if (data.status === "authenticated" && data.accessToken) {
      setAccessToken(data.accessToken);
      router.push("/");
      return;
    }
    if (data.status === "first_access_required" && data.firstAccessToken) {
      sessionStorage.setItem(FIRST_ACCESS_TOKEN_KEY, data.firstAccessToken);
      router.push("/primeiro-acesso");
      return;
    }
    setError("Não foi possível concluir o login.");
  }

  // TODO: Sign in with Apple para web requer o SDK da Apple + Services ID
  // configurado no App Store Connect. A verificação no backend
  // (SocialLoginService.verifyApple) também está pendente dessa mesma
  // configuração — ver STACK_DECISION.md / ENVIRONMENT.md.
  function handleAppleLogin() {
    setError("Login com Apple ainda não disponível para este cliente.");
  }

  // TODO: substituir por Google Identity Services real (carregar
  // https://accounts.google.com/gsi/client, renderizar o botão oficial e
  // enviar o `credential` recebido para /api/bff/social/login).
  function handleGoogleLogin() {
    setError("Login com Google ainda não disponível para este cliente.");
  }

  return (
    <div className="space-y-6">
      {step === "contact" && (
        <form onSubmit={handleRequestCode} className="space-y-4">
          {otpChannels.length > 1 && (
            <div className="flex gap-2">
              {otpChannels.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
                    channel === c ? "border-primary bg-primary/5 text-primary" : "border-black/10 text-text-secondary"
                  }`}
                >
                  {CHANNEL_LABELS[c]}
                </button>
              ))}
            </div>
          )}
          <input
            type={channel === "email" ? "email" : "tel"}
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={channel === "email" ? "seuemail@exemplo.com" : "(00) 00000-0000"}
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Enviando..." : `Enviar código por ${CHANNEL_LABELS[channel]}`}
          </Button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <p className="text-sm text-text-secondary">Digite o código enviado para {contact}.</p>
          <input
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-center text-lg tracking-widest"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Validando..." : "Confirmar código"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("contact")}>
            Usar outro contato
          </Button>
        </form>
      )}

      {socialProviders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <div className="h-px flex-1 bg-black/10" />
            ou continue com
            <div className="h-px flex-1 bg-black/10" />
          </div>
          <div className="grid grid-cols-1 gap-3">
            {socialProviders.includes("google") && (
              <Button variant="outline" onClick={handleGoogleLogin} className="w-full">
                Continuar com Google
              </Button>
            )}
            {socialProviders.includes("apple") && (
              <Button variant="outline" onClick={handleAppleLogin} className="w-full">
                Continuar com Apple
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { FIRST_ACCESS_TOKEN_KEY };
