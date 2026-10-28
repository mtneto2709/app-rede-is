import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
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

  const statusColor: Record<VaccinationCardEntry["status"], string> = {
    administered: theme.colors.success,
    late: theme.colors.warning,
    upcoming: theme.colors.secondary,
  };

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
          {groupByImmunobiologic(data.entries).map(([immunoName, doses]) => (
            <View key={immunoName} style={{ gap: 8 }}>
              <Text style={styles.sectionTitle}>{immunoName}</Text>
              <View style={styles.grid}>
                {doses.map((dose) => (
                  <View key={dose.id} style={[styles.card, { borderLeftColor: statusColor[dose.status] }]}>
                    <Text style={styles.doseLabel} numberOfLines={2}>
                      {dose.doseLabel}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: statusColor[dose.status] }]}>
                      <Text style={styles.badgeText}>{STATUS_LABEL[dose.status]}</Text>
                    </View>
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
    badge: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
    badgeText: { fontSize: 9, fontWeight: "700", color: "#FFFFFF" },
    cardDetail: { fontSize: 10, color: theme.colors.textSecondary },
  });
}
