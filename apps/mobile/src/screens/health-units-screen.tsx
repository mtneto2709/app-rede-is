import { Text } from "react-native";
import type { HealthUnit } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { ScreenList, Card } from "@/components/screen-list";

const TYPE_LABEL: Record<HealthUnit["type"], string> = {
  ubs: "UBS",
  hospital: "Hospital",
  clinic: "Clínica",
  laboratory: "Laboratório",
  other: "Outro",
};

export function HealthUnitsScreen() {
  const { data, isLoading, error } = useMeQuery<HealthUnit[]>("health-units");
  const theme = useTheme();

  return (
    <ScreenList
      title="Unidades de Saúde"
      data={data}
      isLoading={isLoading}
      error={error}
      emptyLabel="Nenhuma unidade encontrada."
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <Card>
          <Text style={{ fontWeight: "600", color: theme.colors.textPrimary }}>{item.name}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            {TYPE_LABEL[item.type]} · {item.address}
          </Text>
          {item.phone && <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{item.phone}</Text>}
        </Card>
      )}
    />
  );
}
