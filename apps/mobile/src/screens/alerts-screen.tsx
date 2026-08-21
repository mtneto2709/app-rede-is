import { Text } from "react-native";
import type { Alert } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { ScreenList, Card } from "@/components/screen-list";

export function AlertsScreen() {
  const { data, isLoading, error } = useMeQuery<Alert[]>("alerts");
  const theme = useTheme();

  return (
    <ScreenList
      title="Alertas"
      data={data}
      isLoading={isLoading}
      error={error}
      emptyLabel="Nenhum alerta no momento."
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <Card>
          <Text style={{ fontWeight: "600", color: theme.colors.textPrimary }}>{item.title}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{item.message}</Text>
        </Card>
      )}
    />
  );
}
