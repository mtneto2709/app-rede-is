import { Text } from "react-native";
import type { Document } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { ScreenList, Card } from "@/components/screen-list";

const TYPE_LABEL: Record<Document["type"], string> = {
  prescription: "Receita",
  exam: "Exame",
  certificate: "Atestado",
  report: "Relatório",
};

export function DocumentsScreen() {
  const { data, isLoading, error } = useMeQuery<Document[]>("documents");
  const theme = useTheme();

  return (
    <ScreenList
      title="Documentos"
      data={data}
      isLoading={isLoading}
      error={error}
      emptyLabel="Nenhum documento encontrado."
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <Card>
          <Text style={{ fontWeight: "600", color: theme.colors.textPrimary }}>{item.title}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            {TYPE_LABEL[item.type]} · {new Date(item.issuedAt).toLocaleDateString("pt-BR")}
          </Text>
        </Card>
      )}
    />
  );
}
