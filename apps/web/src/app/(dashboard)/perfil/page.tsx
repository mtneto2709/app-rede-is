"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IdCard, Calendar, CreditCard, Phone, Mail } from "lucide-react";
import type { PatientProfileSummary } from "@rede-is/shared-types";
import { useAuth } from "@/lib/auth-context";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof IdCard; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-black/5 last:border-b-0">
      <Icon className="h-4 w-4 text-text-secondary shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-text-secondary uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { accessToken, logout } = useAuth();
  const router = useRouter();
  const { data: profile, isLoading } = useMeQuery<PatientProfileSummary>("profile");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    try {
      await fetch("/api/bff/account", {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      await logout();
      router.push("/login");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Meu Perfil" />
      <div className="px-6 space-y-4">
        <Card className="p-4">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 pb-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-base font-bold shrink-0">
                  {profile?.name ? initials(profile.name) : "?"}
                </div>
                <p className="text-base font-semibold">{profile?.name || "—"}</p>
              </div>
              <InfoRow icon={IdCard} label="CPF" value={profile?.cpf ?? null} />
              <InfoRow icon={Calendar} label="Data de nascimento" value={formatDate(profile?.birthDate ?? null)} />
              <InfoRow icon={CreditCard} label="Cartão Nacional de Saúde" value={profile?.cns ?? null} />
              <InfoRow icon={Phone} label="Telefone" value={profile?.phone ?? null} />
              <InfoRow icon={Mail} label="E-mail" value={profile?.email ?? null} />
            </>
          )}
          <p className="text-xs text-text-secondary pt-3">
            Esses dados vêm diretamente do Sistema IS / e-SUS PEC e não podem ser editados por aqui.
          </p>
        </Card>

        <Button variant="outline" className="w-full" onClick={handleLogout}>
          Sair
        </Button>

        <Card className="p-4 space-y-3 border-danger/30">
          <p className="text-sm font-medium text-danger">Excluir conta</p>
          <p className="text-xs text-text-secondary">
            Isso remove seu acesso à plataforma e revoga suas sessões. Seu histórico clínico permanece nas bases de
            saúde, que não pertencem a esta plataforma.
          </p>
          {!confirmingDelete ? (
            <Button variant="outline" className="w-full border-danger text-danger" onClick={() => setConfirmingDelete(true)}>
              Excluir minha conta
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                className="w-full bg-danger hover:opacity-90"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
              >
                {isDeleting ? "Excluindo..." : "Confirmar exclusão"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
