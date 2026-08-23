"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { accessToken, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !accessToken) router.replace("/login");
  }, [isLoading, accessToken, router]);

  if (isLoading || !accessToken) {
    return <main className="min-h-screen flex items-center justify-center text-text-secondary">Carregando...</main>;
  }

  return <div className="max-w-md mx-auto min-h-screen bg-app pb-6">{children}</div>;
}
