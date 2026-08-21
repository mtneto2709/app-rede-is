"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-3 px-6 py-5 sticky top-0 bg-app z-10">
      <button onClick={() => router.back()} className="p-1 -ml-1 text-text-secondary">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
