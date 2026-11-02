import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/theme-provider";
import type { MainTabParamList } from "@/navigation/root-navigator";

/**
 * Cabeçalho com botão de voltar — espelha `apps/web/src/components/page-header.tsx`.
 * Necessário porque a tab bar de baixo foi removida (tudo já é acessível
 * pelos links da home), então cada tela secundária precisa da própria forma
 * de voltar. Como as telas vivem num `Tab.Navigator` (não um `Stack`), não
 * há histórico de navegação pra usar `goBack()` — sempre volta direto pra
 * "Dashboard".
 *
 * Mesma barra de topo em cor primária da home (dashboard-screen.tsx —
 * `theme.colors.primary` + cantos arredondados embaixo), e o título usa a
 * mesma tipografia do nome do app lá (18/600, cor `primaryForeground`).
 * `paddingTop` soma o inset seguro do topo (`useSafeAreaInsets`) — sem
 * isso, no Android, o conteúdo ficava colado/atrás da barra de status do
 * sistema (bug real reportado: `SafeAreaView` do "react-native" puro é
 * sempre um no-op no Android, só funciona no iOS; a versão correta é a do
 * pacote `react-native-safe-area-context`, já instalado e com
 * `SafeAreaProvider` configurado em App.tsx, mas nenhuma tela usava).
 */
export function ScreenHeader({ title }: { title: string }) {
  const theme = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <Pressable onPress={() => navigation.navigate("Dashboard")} style={styles.backButton} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.primaryForeground} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingBottom: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.primary,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    backButton: { padding: 8 },
    title: { fontSize: 18, fontWeight: "600", color: theme.colors.primaryForeground },
  });
}
