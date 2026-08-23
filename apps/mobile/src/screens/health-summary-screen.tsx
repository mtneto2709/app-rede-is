import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { HealthSummary } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/screen-list";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function HealthSummaryScreen() {
  const { data, isLoading, error } = useMeQuery<HealthSummary>("health-summary");
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title="Minha Saúde" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}>
        {isLoading && <ActivityIndicator color={theme.colors.primary} />}
        {error && <Text style={{ color: theme.colors.danger }}>{error}</Text>}
        {!isLoading && data && !data.available && (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            Essas informações ainda não estão disponíveis para o seu cadastro. Consulte sua unidade de saúde.
          </Text>
        )}
        {data?.available && (
          <>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="heart-outline" size={16} color={theme.colors.danger} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary }}>Comorbidades</Text>
              </View>
              {data.conditions.length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Nenhuma comorbidade registrada.</Text>
              ) : (
                data.conditions.map((c) => (
                  <Card key={c.id}>
                    <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{c.label}</Text>
                  </Card>
                ))
              )}
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="medical-outline" size={16} color={theme.colors.success} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary }}>
                  Medicamentos de uso contínuo
                </Text>
              </View>
              {data.medications.length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  Nenhum medicamento de uso contínuo registrado.
                </Text>
              ) : (
                data.medications.map((m) => (
                  <Card key={m.id}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary }}>{m.name}</Text>
                    {m.dosage && <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{m.dosage}</Text>}
                  </Card>
                ))
              )}
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="flask-outline" size={16} color={theme.colors.secondary} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary }}>
                  Resultados de exames
                </Text>
              </View>
              {data.exams.length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  Nenhum resultado de exame disponível.
                </Text>
              ) : (
                data.exams.map((e) => (
                  <Card key={e.id}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary }}>{e.name}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                      {formatDate(e.resultAt) ?? formatDate(e.requestedAt)}
                    </Text>
                    {e.result && <Text style={{ fontSize: 12, marginTop: 2 }}>{e.result}</Text>}
                  </Card>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
