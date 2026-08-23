import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/theme/theme-provider";
import type { MainTabParamList } from "@/navigation/root-navigator";

/**
 * Cabeçalho com botão de voltar — espelha `apps/web/src/components/page-header.tsx`.
 * Necessário porque a tab bar de baixo foi removida (tudo já é acessível
 * pelos links da home), então cada tela secundária precisa da própria forma
 * de voltar. Como as telas vivem num `Tab.Navigator` (não um `Stack`), não
 * há histórico de navegação pra usar `goBack()` — sempre volta direto pra
 * "Dashboard".
 */
export function ScreenHeader({ title }: { title: string }) {
  const theme = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const styles = createStyles(theme);

  return (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.navigate("Dashboard")} style={styles.backButton} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.textSecondary} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
    backButton: { padding: 8 },
    title: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary },
  });
}
