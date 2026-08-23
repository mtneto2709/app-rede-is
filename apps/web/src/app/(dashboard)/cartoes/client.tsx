"use client";

import { useState } from "react";
import type { TenantTheme } from "@rede-is/theme-tokens";
import type { PatientProfileSummary } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type CardTemplate = TenantTheme["cards"][number];

/** Frente/verso do molde de cartão, com nome/CNS reais do paciente sobrepostos — nunca gravados na imagem. */
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
      {face === "front" && card.showPatientName && profile?.name && (
        <p
          className="absolute font-bold text-[#12314f]"
          style={{ left: "4.7%", top: "27%", fontSize: "clamp(11px, 2.4vw, 22px)" }}
        >
          {profile.name}
        </p>
      )}
      {face === "front" && card.showCns && profile?.cns && (
        <p
          className="absolute font-bold text-[#12314f] tracking-wide"
          style={{ left: "4.7%", top: "40%", fontSize: "clamp(11px, 2.4vw, 22px)" }}
        >
          {profile.cns}
        </p>
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
