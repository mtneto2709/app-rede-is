import { useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ReactElement } from "react";
import type { VaccinationCardEntry, VaccinationCardResponse } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { ScreenHeader } from "@/components/screen-header";

const STATUS_LABEL: Record<VaccinationCardEntry["status"], string> = {
  administered: "Tomada",
  late: "Atrasada",
  upcoming: "Futura",
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

export function VaccinationScreen(): ReactElement {
  const { data, isLoading, error } = useMeQuery<VaccinationCardResponse>("vaccination-card");
  const theme = useTheme();
  const styles = createStyles(theme);
  const [activeStatuses, setActiveStatuses] = useState<Set<VaccinationCardEntry["status"]>>(new Set(ALL_STATUSES));

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
                  <View key={dose.id} style={[styles.card, { borderLeftColor: statusColor[dose.status] }]}>
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
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
