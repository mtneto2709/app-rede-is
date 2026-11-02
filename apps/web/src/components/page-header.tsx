"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactElement } from "react";

/**
 * Mesma barra de topo (gradiente primary->secondary, cantos arredondados
 * embaixo) e tipografia do título (text-lg font-semibold) do nome do app
 * na home (dashboard-home.tsx) — mesmo padrão aplicado no mobile
 * (ScreenHeader).
 */
export function PageHeader({ title }: { title: string }): ReactElement {
  const router = useRouter();
  return (
    <header className="flex items-center gap-3 px-6 py-5 sticky top-0 z-10 bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-b-[32px]">
      <button onClick={() => router.back()} className="p-1 -ml-1">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
