"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, FileText, Bell, User } from "lucide-react";
import type { ReactElement } from "react";

const ITEMS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/agendamentos", label: "Agenda", icon: Calendar },
  { href: "/documentos", label: "Docs", icon: FileText },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function BottomNav(): ReactElement {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface border-t border-black/5 flex">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs ${
              active ? "text-primary" : "text-text-secondary"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
