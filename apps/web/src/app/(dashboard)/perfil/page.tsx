"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { accessToken, logout } = useAuth();
  const router = useRouter();
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
          <p className="text-sm text-text-secondary">
            Seus dados cadastrais (nome, CPF, cartão SUS) vêm diretamente do Sistema IS / e-SUS PEC e não podem ser
            editados por aqui.
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
