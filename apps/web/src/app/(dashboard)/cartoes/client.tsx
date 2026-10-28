"use client";

import { useState } from "react";
import type { TenantTheme } from "@rede-is/theme-tokens";
import type { PatientProfileSummary } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type CardTemplate = TenantTheme["cards"][number];

/** Frente/verso do molde de cartão, com nome/CPF/CNS reais do paciente sobrepostos — nunca gravados na imagem. */
function CardFace({
  card,
  profile,
  face,
}: {
  card: CardTemplate;
  profile: PatientProfileSummary | null;
  face: "front" | "back";
}) {
  const imageUrl = face === "front" ? card.frontImageUrl : card.backImageUrl;
  if (!imageUrl) return null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-xl" style={{ aspectRatio: "1013 / 638" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={card.title} className="absolute inset-0 w-full h-full object-cover" />
      {face === "front" && (
        <div
          className="absolute flex flex-col gap-1 font-bold text-white"
          style={{
            left: "9%",
            top: "66%",
            fontSize: "clamp(9px, 1.9vw, 17px)",
            textShadow: "0 1px 4px rgba(0,0,0,0.55)",
          }}
        >
          {card.showPatientName && profile?.name && <p>{profile.name}</p>}
          {card.showCpf && profile?.cpf && <p>{profile.cpf}</p>}
          {card.showCns && profile?.cns && <p>{profile.cns}</p>}
        </div>
      )}
    </div>
  );
}

function CardFlipViewer({
  card,
  profile,
  onClose,
}: {
  card: CardTemplate;
  profile: PatientProfileSummary | null;
  onClose: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const canFlip = !!card.backImageUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center px-6" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-6 right-6 text-white/80 hover:text-white text-sm font-medium"
      >
        Fechar ✕
      </button>
      <div
        className="w-full max-w-lg"
        style={{ perspective: "1600px" }}
        onClick={(e) => {
          e.stopPropagation();
          if (canFlip) setFlipped((f) => !f);
        }}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <div style={{ backfaceVisibility: "hidden" }}>
            <CardFace card={card} profile={profile} face="front" />
          </div>
          {canFlip && (
            <div
              className="absolute inset-0"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <CardFace card={card} profile={profile} face="back" />
            </div>
          )}
        </div>
      </div>
      {canFlip && <p className="text-white/60 text-xs mt-4">Toque no cartão para ver o verso</p>}
    </div>
  );
}

export function CardsPageClient({ cards }: { cards: TenantTheme["cards"] }) {
  const { data: profile, isLoading } = useMeQuery<PatientProfileSummary>("profile");
  const [selected, setSelected] = useState<string | null>(null);
  const selectedCard = cards.find((c) => c.id === selected) ?? null;

  return (
    <div>
      <PageHeader title="Meus Cartões" />
      <div className="px-6 space-y-3">
        {cards.length === 0 && <p className="text-sm text-text-secondary">Nenhum cartão disponível.</p>}
        {cards.map((card) => (
          <Card
            key={card.id}
            className="p-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelected(card.id)}
          >
            {isLoading ? (
              <Skeleton className="w-full" style={{ aspectRatio: "1013 / 638" }} />
            ) : (
              <CardFace card={card} profile={profile ?? null} face="front" />
            )}
            <p className="text-sm font-medium mt-2 text-center">{card.title}</p>
          </Card>
        ))}
      </div>
      {selectedCard && (
        <CardFlipViewer card={selectedCard} profile={profile ?? null} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
