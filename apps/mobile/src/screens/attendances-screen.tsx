import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Attendance } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { withAlpha } from "@/theme/tone";
import { ScreenList, Card } from "@/components/screen-list";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

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
      renderItem={(item) => (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
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
              <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 12 }}>
                {initials(item.professionalName)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.textPrimary }}>
                {item.professionalName ?? item.specialty ?? "Atendimento"}
              </Text>
              {item.specialty && (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{item.specialty}</Text>
              )}
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
              {new Date(item.occurredAt).toLocaleDateString("pt-BR")}
            </Text>
          </View>
          {(item.typeLabel || item.healthUnitName) && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {item.typeLabel && (
                <View
                  style={{
                    backgroundColor: withAlpha(theme.colors.secondary, "1A"),
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "600", color: theme.colors.secondary }}>
                    {item.typeLabel}
                  </Text>
                </View>
              )}
              {item.healthUnitName && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>{item.healthUnitName}</Text>
                </View>
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
      )}
    />
  );
}
