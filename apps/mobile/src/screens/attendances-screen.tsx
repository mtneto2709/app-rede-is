import { Text } from "react-native";
import type { Attendance } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { ScreenList, Card } from "@/components/screen-list";

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
        <Card>
          <Text style={{ fontWeight: "600", color: theme.colors.textPrimary }}>
            {item.professionalName ?? item.specialty ?? "Atendimento"}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            {new Date(item.occurredAt).toLocaleDateString("pt-BR")}
          </Text>
          {item.diagnosis && <Text style={{ fontSize: 12, marginTop: 4 }}>Diagnóstico: {item.diagnosis}</Text>}
          {item.prescription && <Text style={{ fontSize: 12 }}>Prescrição: {item.prescription}</Text>}
        </Card>
      )}
    />
  );
}
