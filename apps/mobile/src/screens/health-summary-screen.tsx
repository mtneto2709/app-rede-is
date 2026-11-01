import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  classifyConditionCategory,
  CONDITION_EDUCATION,
  type ConditionCategory,
  type HealthCondition,
  type HealthSummary,
} from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { withAlpha } from "@/theme/tone";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/screen-list";

const CONDITION_ICON: Record<ConditionCategory, keyof typeof Ionicons.glyphMap> = {
  hipertensao: "pulse-outline",
  diabetes: "water-outline",
  cancer: "ribbon-outline",
  derrame: "flash-outline",
  infarto: "heart-dislike-outline",
  doenca_cardiaca: "heart-outline",
  problema_rins: "filter-outline",
  doenca_respiratoria: "medical-outline",
  tuberculose: "thermometer-outline",
  hanseniase: "hand-left-outline",
  saude_mental: "body-outline",
  fumante: "flame-outline",
  uso_alcool: "wine-outline",
  outro: "medical-outline",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function ConditionDetailModal({
  condition,
  onClose,
  theme,
}: {
  condition: HealthCondition;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const category = classifyConditionCategory(condition.label);
  const icon = CONDITION_ICON[category];
  const content = CONDITION_EDUCATION[category];

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
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: withAlpha(theme.colors.primary, "1A"),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={icon} size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary }}>
                  {condition.label}
                </Text>
                {condition.startedAt && (
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                    Início: {formatDate(condition.startedAt)}
                  </Text>
                )}
              </View>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={{ gap: 12 }} contentContainerStyle={{ gap: 12 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase", marginBottom: 4 }}>
                O que é
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.textPrimary, lineHeight: 19 }}>{content.whatIsIt}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase", marginBottom: 4 }}>
                Riscos
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.textPrimary, lineHeight: 19 }}>{content.risks}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase", marginBottom: 4 }}>
                Cuidados
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.textPrimary, lineHeight: 19 }}>{content.care}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase", marginBottom: 4 }}>
                O que evitar
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.textPrimary, lineHeight: 19 }}>{content.avoid}</Text>
            </View>
            <Text
              style={{
                fontSize: 10,
                color: theme.colors.textSecondary,
                borderTopWidth: 1,
                borderTopColor: "rgba(0,0,0,0.06)",
                paddingTop: 10,
              }}
            >
              Informação geral, não substitui orientação de um profissional de saúde sobre o seu caso.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
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
  const [selectedCondition, setSelectedCondition] = useState<HealthCondition | null>(null);

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
                  <Pressable key={c.id} onPress={() => setSelectedCondition(c)}>
                    <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons name={CONDITION_ICON[classifyConditionCategory(c.label)]} size={16} color={theme.colors.danger} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{c.label}</Text>
                        {c.startedAt && (
                          <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                            Início: {formatDate(c.startedAt)}
                          </Text>
                        )}
                      </View>
                    </Card>
                  </Pressable>
                ))
              )}
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="clipboard-outline" size={16} color={theme.colors.secondary} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary }}>
                  Condições de saúde autorreferidas
                </Text>
              </View>
              {data.selfReportedConditions.length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  Nenhuma condição autorreferida registrada.
                </Text>
              ) : (
                data.selfReportedConditions.map((c) => (
                  <Pressable key={c.id} onPress={() => setSelectedCondition(c)}>
                    <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons name={CONDITION_ICON[classifyConditionCategory(c.label)]} size={16} color={theme.colors.secondary} />
                      <Text style={{ fontSize: 13, color: theme.colors.textPrimary, flex: 1 }}>{c.label}</Text>
                    </Card>
                  </Pressable>
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
      {selectedCondition && (
        <ConditionDetailModal condition={selectedCondition} onClose={() => setSelectedCondition(null)} theme={theme} />
      )}
    </View>
  );
}
