import { Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Document } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { withAlpha } from "@/theme/tone";
import { ScreenList, Card } from "@/components/screen-list";

const TYPE_LABEL: Record<Document["type"], string> = {
  prescription: "Receita",
  exam: "Exame",
  certificate: "Atestado",
  report: "Relatório",
};

const TYPE_ICON: Record<Document["type"], keyof typeof Ionicons.glyphMap> = {
  prescription: "medical-outline",
  exam: "flask-outline",
  certificate: "ribbon-outline",
  report: "clipboard-outline",
};

export function DocumentsScreen() {
  const { data, isLoading, error } = useMeQuery<Document[]>("documents");
  const theme = useTheme();

  const typeColor: Record<Document["type"], string> = {
    prescription: theme.colors.success,
    exam: theme.colors.secondary,
    certificate: theme.colors.warning,
    report: theme.colors.primary,
  };

  return (
    <ScreenList
      title="Documentos"
      data={data}
      isLoading={isLoading}
      error={error}
      emptyLabel="Nenhum documento encontrado."
      keyExtractor={(item) => item.id}
      renderItem={(item) => {
        const color = typeColor[item.type];
        return (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: withAlpha(color, "1A"),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={TYPE_ICON[item.type]} size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.textPrimary }}>{item.title}</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                {TYPE_LABEL[item.type]} · {new Date(item.issuedAt).toLocaleDateString("pt-BR")}
              </Text>
            </View>
            {item.fileUrl && (
              <Pressable
                onPress={() => Linking.openURL(item.fileUrl!).catch(() => {})}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  borderWidth: 1,
                  borderColor: withAlpha(theme.colors.primary, "4D"),
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Ionicons name="download-outline" size={14} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: "700" }}>Baixar</Text>
              </Pressable>
            )}
          </Card>
        );
      }}
    />
  );
}
