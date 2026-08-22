import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Alert } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { withAlpha } from "@/theme/tone";
import { ScreenList, Card } from "@/components/screen-list";

const TYPE_ICON: Record<Alert["type"], keyof typeof Ionicons.glyphMap> = {
  medication: "medical-outline",
  appointment: "calendar-outline",
  vaccine: "bandage-outline",
  exam: "document-text-outline",
};

const PRIORITY_LABEL: Record<Alert["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export function AlertsScreen() {
  const { data, isLoading, error } = useMeQuery<Alert[]>("alerts");
  const theme = useTheme();

  const priorityColor: Record<Alert["priority"], string> = {
    low: theme.colors.success,
    medium: theme.colors.warning,
    high: theme.colors.danger,
  };

  return (
    <ScreenList
      title="Alertas"
      data={data}
      isLoading={isLoading}
      error={error}
      emptyLabel="Nenhum alerta no momento."
      keyExtractor={(item) => item.id}
      renderItem={(item) => {
        const color = priorityColor[item.priority];
        return (
          <Card style={{ borderLeftWidth: 4, borderLeftColor: color, flexDirection: "row", gap: 10 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: withAlpha(color, "1A"),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={TYPE_ICON[item.type]} size={16} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <Text style={{ fontWeight: "600", color: theme.colors.textPrimary, flex: 1 }}>{item.title}</Text>
                <View style={{ backgroundColor: withAlpha(color, "1A"), borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color, fontSize: 10, fontWeight: "700" }}>{PRIORITY_LABEL[item.priority]}</Text>
                </View>
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>{item.message}</Text>
            </View>
          </Card>
        );
      }}
    />
  );
}
