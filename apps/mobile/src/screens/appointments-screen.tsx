import { Text } from "react-native";
import type { Appointment } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { ScreenList, Card } from "@/components/screen-list";

const STATUS_LABEL: Record<Appointment["status"], string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  missed: "Não compareceu",
};

export function AppointmentsScreen() {
  const { data, isLoading, error } = useMeQuery<Appointment[]>("appointments");
  const theme = useTheme();

  return (
    <ScreenList
      title="Agendamentos"
      data={data}
      isLoading={isLoading}
      error={error}
      emptyLabel="Nenhum agendamento encontrado."
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <Card>
          <Text style={{ fontWeight: "600", color: theme.colors.textPrimary }}>
            {item.professionalName ?? item.specialty ?? "Consulta"}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{item.specialty}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            {new Date(item.scheduledAt).toLocaleString("pt-BR")} · {STATUS_LABEL[item.status]}
          </Text>
        </Card>
      )}
    />
  );
}
