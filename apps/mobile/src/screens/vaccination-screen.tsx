import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ReactElement } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { VaccinationCardEntry, VaccinationCardResponse } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { ScreenHeader } from "@/components/screen-header";

const STATUS_LABEL: Record<VaccinationCardEntry["status"], string> = {
  administered: "Tomada",
  late: "Atrasada",
  upcoming: "Futura",
};

const SOURCE_LABEL: Record<VaccinationCardEntry["sourceSystem"], string> = {
  "sistema-is": "Sistema IS",
  "esus-pec": "e-SUS PEC",
};

const ALL_STATUSES = Object.keys(STATUS_LABEL) as VaccinationCardEntry["status"][];

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function groupByImmunobiologic(entries: VaccinationCardEntry[]): [string, VaccinationCardEntry[]][] {
  const groups = new Map<string, VaccinationCardEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.immunobiologicName) ?? [];
    list.push(entry);
    groups.set(entry.immunobiologicName, list);
  }
  return [...groups.entries()];
}

function DetailRow({ label, value, theme }: { label: string; value: string | null; theme: ReturnType<typeof useTheme> }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.06)",
        paddingBottom: 8,
      }}
    >
      <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, flex: 1, textAlign: "right" }}>
        {value ?? "Não informado"}
      </Text>
    </View>
  );
}

function DoseDetailModal({
  dose,
  onClose,
  theme,
}: {
  dose: VaccinationCardEntry;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: "85%",
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary }}>
                {dose.immunobiologicName}
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 }}>{dose.doseLabel}</Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ gap: 10 }}>
            <DetailRow label="Status" value={STATUS_LABEL[dose.status]} theme={theme} />
            {dose.status === "administered" ? (
              <>
                <DetailRow label="Data da aplicação" value={formatDate(dose.administeredAt)} theme={theme} />
                <DetailRow label="Unidade de saúde" value={dose.administeredAtHealthUnit} theme={theme} />
                <DetailRow label="Profissional" value={dose.administeredByProfessional} theme={theme} />
              </>
            ) : (
              <DetailRow label="Data prevista" value={formatDate(dose.dueDate)} theme={theme} />
            )}
            <DetailRow label="Fonte dos dados" value={SOURCE_LABEL[dose.sourceSystem]} theme={theme} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function VaccinationScreen(): ReactElement {
  const { data, isLoading, error } = useMeQuery<VaccinationCardResponse>("vaccination-card");
  const theme = useTheme();
  const styles = createStyles(theme);
  const [activeStatuses, setActiveStatuses] = useState<Set<VaccinationCardEntry["status"]>>(new Set(ALL_STATUSES));
  const [selected, setSelected] = useState<VaccinationCardEntry | null>(null);

  const statusColor: Record<VaccinationCardEntry["status"], string> = {
    administered: theme.colors.success,
    late: theme.colors.warning,
    upcoming: theme.colors.secondary,
  };

  function toggleStatus(status: VaccinationCardEntry["status"]) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  const visibleEntries = data?.available ? data.entries.filter((e) => activeStatuses.has(e.status)) : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Caderneta de Vacinação" />
      {isLoading && <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {!isLoading && data && !data.available && (
        <Text style={styles.empty}>
          A caderneta de vacinação ainda não está disponível para o seu cadastro. Procure sua unidade de saúde para
          consultar suas vacinas.
        </Text>
      )}
      {!isLoading && data?.available && data.entries.length === 0 && (
        <Text style={styles.empty}>Não foi possível montar o calendário vacinal — cadastro sem data de nascimento.</Text>
      )}
      {data?.available && data.entries.length > 0 && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {ALL_STATUSES.map((status) => {
              const active = activeStatuses.has(status);
              const color = statusColor[status];
              return (
                <Pressable
                  key={status}
                  onPress={() => toggleStatus(status)}
                  style={[
                    styles.filterChip,
                    { borderColor: color, backgroundColor: active ? color : theme.colors.background },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: active ? "#FFFFFF" : color }]}>
                    {STATUS_LABEL[status]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {groupByImmunobiologic(visibleEntries).map(([immunoName, doses]) => (
            <View key={immunoName} style={{ gap: 8 }}>
              <Text style={styles.sectionTitle}>{immunoName}</Text>
              <View style={styles.grid}>
                {doses.map((dose) => (
                  <Pressable
                    key={dose.id}
                    onPress={() => setSelected(dose)}
                    style={[styles.card, { borderLeftColor: statusColor[dose.status] }]}
                  >
                    <Text style={styles.doseLabel} numberOfLines={2}>
                      {dose.doseLabel}
                    </Text>
                    {dose.status === "administered" ? (
                      <>
                        <Text style={styles.cardDetail}>{formatDate(dose.administeredAt)}</Text>
                        {dose.administeredAtHealthUnit && (
                          <Text style={styles.cardDetail} numberOfLines={1} ellipsizeMode="tail">
                            {dose.administeredAtHealthUnit}
                          </Text>
                        )}
                        {dose.administeredByProfessional && (
                          <Text style={styles.cardDetail} numberOfLines={1} ellipsizeMode="tail">
                            {dose.administeredByProfessional}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text style={styles.cardDetail}>{formatDate(dose.dueDate)}</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      {selected && <DoseDetailModal dose={selected} onClose={() => setSelected(null)} theme={theme} />}
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    error: { color: theme.colors.danger, paddingHorizontal: 20 },
    empty: { color: theme.colors.textSecondary, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    card: {
      width: "31%",
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderLeftWidth: 4,
      padding: 8,
      gap: 3,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
    },
    doseLabel: { fontSize: 11, fontWeight: "600", color: theme.colors.textPrimary },
    filterChip: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    filterChipText: { fontSize: 12, fontWeight: "700" },
    cardDetail: { fontSize: 10, color: theme.colors.textSecondary },
  });
}
