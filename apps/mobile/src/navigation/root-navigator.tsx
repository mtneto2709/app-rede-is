import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/theme/theme-provider";
import { LoginScreen } from "@/screens/login-screen";
import { FirstAccessScreen } from "@/screens/first-access-screen";
import { DashboardScreen } from "@/screens/dashboard-screen";
import { AppointmentsScreen } from "@/screens/appointments-screen";
import { TeleconsultaScreen } from "@/screens/teleconsulta-screen";
import { AttendancesScreen } from "@/screens/attendances-screen";
import { DocumentsScreen } from "@/screens/documents-screen";
import { AlertsScreen } from "@/screens/alerts-screen";
import { HealthUnitsScreen } from "@/screens/health-units-screen";
import { VaccinationScreen } from "@/screens/vaccination-screen";
import { CardsScreen } from "@/screens/cards-screen";
import { HealthSummaryScreen } from "@/screens/health-summary-screen";
import { MoreServicesScreen } from "@/screens/more-services-screen";
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
  Teleconsulta: undefined;
  Atendimentos: undefined;
  Documentos: undefined;
  Vacinacao: undefined;
  Cartoes: undefined;
  Alertas: undefined;
  Unidades: undefined;
  MinhaSaude: undefined;
  MaisServicos: undefined;
  Social: undefined;
  Contato: undefined;
  Perfil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * A tab bar de baixo fica sempre oculta (`tabBarStyle: { display: "none" }`
 * em `screenOptions`) — todas as telas já são alcançáveis pelos links da
 * home (grade de Serviços + rodapé), então a barra é redundante. Cada tela
 * secundária tem seu próprio botão de voltar (`ScreenHeader`), já que dentro
 * de um `Tab.Navigator` não existe histórico de navegação (`goBack()`) como
 * num `Stack.Navigator` — o botão sempre volta direto pra "Dashboard".
 *
 * Cada `Tab.Screen` gateado por feature flag (ver `theme.features`) só é
 * registrado quando o flag está `true` — quando `false`, a rota
 * literalmente não existe nesse binário (cada tenant tem seu próprio build,
 * então isso já resolve "não deve estar presente no app final" sem precisar
 * de nenhum outro mecanismo). Agendamentos/Atendimentos aparecem duas vezes
 * na home (stats + grade de Serviços) mas usam o mesmo flag.
 */
function MainTabs() {
  const theme = useTheme();
  const { features } = theme;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      {features.agendamentos && <Tab.Screen name="Agendamentos" component={AppointmentsScreen} />}
      {features.teleconsulta && <Tab.Screen name="Teleconsulta" component={TeleconsultaScreen} />}
      {features.atendimentos && <Tab.Screen name="Atendimentos" component={AttendancesScreen} />}
      <Tab.Screen name="Documentos" component={DocumentsScreen} />
      {features.vacinacao && <Tab.Screen name="Vacinacao" component={VaccinationScreen} />}
      {features.cartoes && <Tab.Screen name="Cartoes" component={CardsScreen} />}
      <Tab.Screen name="Alertas" component={AlertsScreen} />
      {features.unidades && <Tab.Screen name="Unidades" component={HealthUnitsScreen} />}
      {features.minhaSaude && <Tab.Screen name="MinhaSaude" component={HealthSummaryScreen} />}
      {features.maisServicos && <Tab.Screen name="MaisServicos" component={MoreServicesScreen} />}
      <Tab.Screen name="Social" component={SocialScreen} />
      <Tab.Screen name="Contato" component={ContactScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
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
