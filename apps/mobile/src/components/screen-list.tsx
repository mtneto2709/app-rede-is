import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/theme-provider";

interface Props<T> {
  title: string;
  data: T[] | null;
  isLoading: boolean;
  error: string | null;
  emptyLabel: string;
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
}

export function ScreenList<T>({ title, data, isLoading, error, emptyLabel, keyExtractor, renderItem }: Props<T>) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {isLoading && <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {!isLoading && data?.length === 0 && <Text style={styles.empty}>{emptyLabel}</Text>}
      <FlatList
        data={data ?? []}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => renderItem(item)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    title: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary, paddingHorizontal: 20, paddingVertical: 16 },
    error: { color: theme.colors.danger, paddingHorizontal: 20 },
    empty: { color: theme.colors.textSecondary, paddingHorizontal: 20 },
  });
}

export function Card({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        gap: 4,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
      }}
    >
      {children}
    </View>
  );
}
