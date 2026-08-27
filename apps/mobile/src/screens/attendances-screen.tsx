import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Attendance, AttendanceCategory } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { withAlpha } from "@/theme/tone";
import { ScreenList, Card } from "@/components/screen-list";

type ToneKey = "primary" | "secondary" | "success" | "warning" | "danger";

/** Ícone + cor por categoria de atendimento — mesma classificação usada no backend (ver AttendanceCategory). */
const CATEGORY_STYLE: Record<AttendanceCategory, { icon: keyof typeof Ionicons.glyphMap; tone: ToneKey }> = {
  consultation: { icon: "medical-outline", tone: "primary" },
  procedure: { icon: "pulse-outline", tone: "warning" },
  homeVisit: { icon: "home-outline", tone: "success" },
  prenatal: { icon: "heart-outline", tone: "secondary" },
  vaccination: { icon: "medkit-outline", tone: "success" },
  dental: { icon: "happy-outline", tone: "secondary" },
  childCare: { icon: "body-outline", tone: "secondary" },
  exam: { icon: "flask-outline", tone: "secondary" },
  dressing: { icon: "bandage-outline", tone: "danger" },
  group: { icon: "people-outline", tone: "warning" },
  other: { icon: "medical-outline", tone: "primary" },
};

export function AttendancesScreen() {
  const { data, isLoading, error } = useMeQuery<Attendance[]>("attendances");
  const theme = useTheme();

  return (
    <ScreenList
      title="Atendimentos"
      data={data}
      isLoading={isLoading}
      error={error}
      emptyLabel="Nenhum atendimento encontrado."
      keyExtractor={(item) => item.id}
      renderItem={(item) => {
        const { icon, tone } = CATEGORY_STYLE[item.category];
        const color = theme.colors[tone];
        const occurred = new Date(item.occurredAt);

        return (
          <Card style={{ gap: 12, borderLeftWidth: 4, borderLeftColor: color }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: withAlpha(color, "1A"),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: theme.colors.textPrimary }}>
                  {item.typeLabel ?? "Atendimento"}
                </Text>
                {item.healthUnitName && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>{item.healthUnitName}</Text>
                  </View>
                )}
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <View style={{ backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>
                    {occurred.toLocaleDateString("pt-BR")}
                  </Text>
                </View>
                <View style={{ backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>
                    {occurred.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            </View>

            {(item.professionalName || item.specialty) && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(0,0,0,0.05)",
                  paddingTop: 8,
                }}
              >
                <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.textPrimary }}>
                  {item.professionalName ?? "Profissional não identificado"}
                </Text>
                {item.specialty && (
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>· {item.specialty}</Text>
                )}
              </View>
            )}

            {(item.ciap2 || item.diagnosis) && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  backgroundColor: withAlpha(theme.colors.secondary, "0D"),
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <Ionicons name="medical-outline" size={16} color={theme.colors.secondary} style={{ marginTop: 1 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  {item.ciap2 && (
                    <Text style={{ fontSize: 12, color: theme.colors.textPrimary }}>
                      <Text style={{ fontWeight: "700" }}>CIAP2: </Text>
                      {item.ciap2}
                    </Text>
                  )}
                  {item.diagnosis && (
                    <Text style={{ fontSize: 12, color: theme.colors.textPrimary }}>
                      <Text style={{ fontWeight: "700" }}>CID10: </Text>
                      {item.diagnosis}
                    </Text>
                  )}
                </View>
              </View>
            )}
            {item.prescription && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  backgroundColor: withAlpha(theme.colors.success, "0D"),
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <Ionicons name="medkit-outline" size={16} color={theme.colors.success} style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 12, flex: 1, color: theme.colors.textPrimary }}>
                  <Text style={{ fontWeight: "700" }}>Prescrição: </Text>
                  {item.prescription}
                </Text>
              </View>
            )}
          </Card>
        );
      }}
    />
  );
}
