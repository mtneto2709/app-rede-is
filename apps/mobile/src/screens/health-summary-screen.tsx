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

function MeasurementStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null;
}) {
  const theme = useTheme();
  if (!value) return null;
  return (
    <View
      style={{
        width: "48%",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 10,
      }}
    >
      <Ionicons name={icon} size={16} color={theme.colors.primary} />
      <View>
        <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary }}>{value}</Text>
        <Text style={{ fontSize: 9, color: theme.colors.textSecondary, textTransform: "uppercase" }}>{label}</Text>
      </View>
    </View>
  );
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
            {data.measurements && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="pulse-outline" size={16} color={theme.colors.primary} />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary }}>
                      Últimas medições
                    </Text>
                  </View>
                  {data.measurements.measuredAt && (
                    <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                      {formatDate(data.measurements.measuredAt)}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <MeasurementStat icon="scale-outline" label="Peso" value={data.measurements.weightKg != null ? `${data.measurements.weightKg} kg` : null} />
                  <MeasurementStat icon="resize-outline" label="Altura" value={data.measurements.heightCm != null ? `${data.measurements.heightCm} cm` : null} />
                  <MeasurementStat
                    icon="heart-outline"
                    label="Pressão arterial"
                    value={
                      data.measurements.bloodPressureSystolic != null && data.measurements.bloodPressureDiastolic != null
                        ? `${data.measurements.bloodPressureSystolic}/${data.measurements.bloodPressureDiastolic} mmHg`
                        : null
                    }
                  />
                  <MeasurementStat icon="pulse-outline" label="Freq. cardíaca" value={data.measurements.heartRate != null ? `${data.measurements.heartRate} bpm` : null} />
                  <MeasurementStat icon="thermometer-outline" label="Temperatura" value={data.measurements.temperature != null ? `${data.measurements.temperature} °C` : null} />
                  <MeasurementStat icon="water-outline" label="Glicemia capilar" value={data.measurements.capillaryGlucose != null ? `${data.measurements.capillaryGlucose} mg/dL` : null} />
                </View>
              </View>
            )}

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="warning-outline" size={16} color={theme.colors.warning} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary }}>
                  Alergias e reações adversas
                </Text>
              </View>
              {data.allergies.length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Nenhuma alergia registrada.</Text>
              ) : (
                data.allergies.map((a) => (
                  <Card key={a.id} style={{ borderLeftWidth: 4, borderLeftColor: theme.colors.warning }}>
                    <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{a.label}</Text>
                  </Card>
                ))
              )}
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="heart-outline" size={16} color={theme.colors.danger} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary }}>
                  Problemas e condições
                </Text>
              </View>
              {data.conditions.length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Nenhuma condição registrada.</Text>
              ) : (
                data.conditions.map((c) => (
                  <Card key={c.id}>
                    <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{c.label}</Text>
                    {c.startedAt && (
                      <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                        Início: {formatDate(c.startedAt)}
                      </Text>
                    )}
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
