import { ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState, type ReactElement } from "react";
import type { VaccinationCardEntry, VaccinationCardResponse } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";

const STATUS_LABEL: Record<VaccinationCardEntry["status"], string> = {
  administered: "Tomada",
  late: "Atrasada",
  upcoming: "Futura",
};

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

export function VaccinationScreen(): ReactElement {
  const { data, isLoading, error } = useMeQuery<VaccinationCardResponse>("vaccination-card");
  const theme = useTheme();
  const styles = createStyles(theme);
  const [selected, setSelected] = useState<VaccinationCardEntry | null>(null);

  const statusColor: Record<VaccinationCardEntry["status"], string> = {
    administered: theme.colors.success,
    late: theme.colors.warning,
    upcoming: theme.colors.secondary,
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Caderneta de Vacinação</Text>
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
          {groupByImmunobiologic(data.entries).map(([immunoName, doses]) => (
            <View key={immunoName} style={{ gap: 8 }}>
              <Text style={styles.sectionTitle}>{immunoName}</Text>
              <View style={styles.grid}>
                {doses.map((dose) => (
                  <Pressable key={dose.id} style={styles.gridItem} onPress={() => setSelected(dose)}>
                    <View style={[styles.card, { borderTopColor: statusColor[dose.status] }]}>
                      <Text style={styles.doseLabel} numberOfLines={1}>
                        {dose.doseLabel}
                      </Text>
                      <Text style={styles.cardDetail} numberOfLines={1}>
                        {dose.status === "administered" ? formatDate(dose.administeredAt) : formatDate(dose.dueDate)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selected && (
              <>
                <Text style={styles.modalTitle}>{selected.immunobiologicName}</Text>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.doseLabel}>{selected.doseLabel}</Text>
                  <View style={[styles.badge, { backgroundColor: statusColor[selected.status] }]}>
                    <Text style={styles.badgeText}>{STATUS_LABEL[selected.status]}</Text>
                  </View>
                </View>
                {selected.status === "administered" ? (
                  <View style={{ gap: 2, marginTop: 8 }}>
                    <Text style={styles.cardDetail}>Aplicada em {formatDate(selected.administeredAt)}</Text>
                    {selected.administeredAtHealthUnit && (
                      <Text style={styles.cardDetail}>Local: {selected.administeredAtHealthUnit}</Text>
                    )}
                    {selected.administeredByProfessional && (
                      <Text style={styles.cardDetail}>Profissional: {selected.administeredByProfessional}</Text>
                    )}
                  </View>
                ) : (
                  <Text style={[styles.cardDetail, { marginTop: 8 }]}>Prevista para {formatDate(selected.dueDate)}</Text>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    title: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary, paddingHorizontal: 20, paddingVertical: 16 },
    error: { color: theme.colors.danger, paddingHorizontal: 20 },
    empty: { color: theme.colors.textSecondary, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
    grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
    gridItem: { width: "33.33%", padding: 4 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      borderTopWidth: 4,
      padding: 10,
      gap: 2,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
    },
    doseLabel: { fontSize: 12, fontWeight: "600", color: theme.colors.textPrimary },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    badgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
    cardDetail: { fontSize: 11, color: theme.colors.textSecondary },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    modalCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 8 },
    modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  });
}
