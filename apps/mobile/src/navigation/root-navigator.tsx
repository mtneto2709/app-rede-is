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
import { AttendancesScreen } from "@/screens/attendances-screen";
import { DocumentsScreen } from "@/screens/documents-screen";
import { AlertsScreen } from "@/screens/alerts-screen";
import { HealthUnitsScreen } from "@/screens/health-units-screen";
import { ProfileScreen } from "@/screens/profile-screen";

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
  Alertas: undefined;
  Unidades: undefined;
  Perfil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Início" }} />
      <Tab.Screen name="Agendamentos" component={AppointmentsScreen} />
      <Tab.Screen name="Atendimentos" component={AttendancesScreen} />
      <Tab.Screen name="Documentos" component={DocumentsScreen} />
      <Tab.Screen name="Alertas" component={AlertsScreen} />
      <Tab.Screen name="Unidades" component={HealthUnitsScreen} />
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
