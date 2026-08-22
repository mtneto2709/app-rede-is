import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/theme/theme-provider";
import { LoginScreen } from "@/screens/login-screen";
import { FirstAccessScreen } from "@/screens/first-access-screen";
import { DashboardScreen } from "@/screens/dashboard-screen";
import { AppointmentsScreen } from "@/screens/appointments-screen";
import { AttendancesScreen } from "@/screens/attendances-screen";
import { DocumentsScreen } from "@/screens/documents-screen";
import { AlertsScreen } from "@/screens/alerts-screen";
import { HealthUnitsScreen } from "@/screens/health-units-screen";
import { VaccinationScreen } from "@/screens/vaccination-screen";
import { ProfileScreen } from "@/screens/profile-screen";
import { SocialScreen } from "@/screens/social-screen";
import { ContactScreen } from "@/screens/contact-screen";

export type RootStackParamList = {
  Login: undefined;
  FirstAccess: { firstAccessToken: string };
  Main: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Agendamentos: undefined;
  Atendimentos: undefined;
  Documentos: undefined;
  Vacinacao: undefined;
  Alertas: undefined;
  Unidades: undefined;
  Social: undefined;
  Contato: undefined;
  Perfil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, { focused: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { focused: "home", outline: "home-outline" },
  Agendamentos: { focused: "calendar", outline: "calendar-outline" },
  Atendimentos: { focused: "medkit", outline: "medkit-outline" },
  Documentos: { focused: "document-text", outline: "document-text-outline" },
  Vacinacao: { focused: "medical", outline: "medical-outline" },
  Alertas: { focused: "notifications", outline: "notifications-outline" },
  Unidades: { focused: "business", outline: "business-outline" },
  Social: { focused: "share-social", outline: "share-social-outline" },
  Contato: { focused: "call", outline: "call-outline" },
  Perfil: { focused: "person", outline: "person-outline" },
};

function MainTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarLabelStyle: { fontSize: 10 },
        tabBarIcon: ({ focused, color, size }) => {
          const icon = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icon.focused : icon.outline} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Início" }} />
      <Tab.Screen name="Agendamentos" component={AppointmentsScreen} options={{ title: "Agenda" }} />
      <Tab.Screen name="Atendimentos" component={AttendancesScreen} options={{ title: "Atend." }} />
      <Tab.Screen name="Documentos" component={DocumentsScreen} options={{ title: "Docs" }} />
      {/*
        Vacinação, Unidades, Redes Sociais e Contato ficam FORA da barra
        (mesmo padrão do web — bottom-nav.tsx só tem
        Início/Agenda/Docs/Alertas/Perfil, o resto é acessado pela grade
        "Serviços"/rodapé da home). Continuam navegáveis por
        navigation.navigate(...) a partir do DashboardScreen — só não
        aparecem como ícone na barra, pra não lotar ainda mais uma barra
        que já tem 6 itens visíveis.
      */}
      <Tab.Screen
        name="Vacinacao"
        component={VaccinationScreen}
        options={{ title: "Vacinas", tabBarButton: () => null }}
      />
      <Tab.Screen name="Alertas" component={AlertsScreen} options={{ title: "Alertas" }} />
      <Tab.Screen
        name="Unidades"
        component={HealthUnitsScreen}
        options={{ title: "Unidades", tabBarButton: () => null }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{ title: "Redes Sociais", tabBarButton: () => null }}
      />
      <Tab.Screen
        name="Contato"
        component={ContactScreen}
        options={{ title: "Contato", tabBarButton: () => null }}
      />
      <Tab.Screen name="Perfil" component={ProfileScreen} options={{ title: "Perfil" }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { accessToken, isLoading } = useAuth();
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {accessToken ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="FirstAccess" component={FirstAccessScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
