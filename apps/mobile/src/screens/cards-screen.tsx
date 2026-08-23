import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TenantTheme } from "@rede-is/theme-tokens";
import type { PatientProfileSummary } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { ScreenHeader } from "@/components/screen-header";

type CardTemplate = TenantTheme["cards"][number];

/** Frente/verso do molde de cartão, com nome/CNS reais do paciente sobrepostos — nunca gravados na imagem. */
function CardFace({ card, profile, face }: { card: CardTemplate; profile: PatientProfileSummary | null; face: "front" | "back" }) {
  const imageUrl = face === "front" ? card.frontImageUrl : card.backImageUrl;
  if (!imageUrl) return null;

  return (
    <View style={styles.faceContainer}>
      <Image source={{ uri: imageUrl }} style={styles.faceImage} resizeMode="cover" />
      {face === "front" && card.showPatientName && profile?.name && (
        <Text style={[styles.overlayText, { top: "27%" }]} numberOfLines={1}>
          {profile.name}
        </Text>
      )}
      {face === "front" && card.showCns && profile?.cns && (
        <Text style={[styles.overlayText, { top: "40%" }]}>{profile.cns}</Text>
      )}
    </View>
  );
}

function CardFullscreen({
  card,
  profile,
  onClose,
}: {
  card: CardTemplate;
  profile: PatientProfileSummary | null;
  onClose: () => void;
}) {
  const [showBack, setShowBack] = useState(false);
  const canFlip = !!card.backImageUrl;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <Pressable
          style={styles.modalCardWrap}
          onPress={() => canFlip && setShowBack((v) => !v)}
        >
          <CardFace card={card} profile={profile} face={showBack ? "back" : "front"} />
        </Pressable>
        {canFlip && <Text style={styles.hint}>Toque no cartão para ver o {showBack ? "frente" : "verso"}</Text>}
      </View>
    </Modal>
  );
}

export function CardsScreen() {
  const theme = useTheme();
  const { data: profile } = useMeQuery<PatientProfileSummary>("profile");
  const [selected, setSelected] = useState<string | null>(null);
  const cards = theme.cards;
  const selectedCard = cards.find((c) => c.id === selected) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title="Meus Cartões" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}>
        {cards.length === 0 && <Text style={{ color: theme.colors.textSecondary }}>Nenhum cartão disponível.</Text>}
        {cards.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => setSelected(card.id)}
            style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 12, gap: 8 }}
          >
            <CardFace card={card} profile={profile ?? null} face="front" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, textAlign: "center" }}>
              {card.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {selectedCard && (
        <CardFullscreen card={selectedCard} profile={profile ?? null} onClose={() => setSelected(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  faceContainer: { width: "100%", aspectRatio: 1013 / 638, borderRadius: 16, overflow: "hidden" },
  faceImage: { width: "100%", height: "100%" },
  overlayText: { position: "absolute", left: "4.7%", fontSize: 15, fontWeight: "700", color: "#12314f" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  closeButton: { position: "absolute", top: 56, right: 24, padding: 8 },
  modalCardWrap: { width: "100%" },
  hint: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 16 },
});
