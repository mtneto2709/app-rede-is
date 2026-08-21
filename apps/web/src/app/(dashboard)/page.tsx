import { getCurrentTenantTheme } from "@/lib/theme";
import { DashboardHome } from "@/components/dashboard-home";

export default async function DashboardPage() {
  const theme = await getCurrentTenantTheme();
  return <DashboardHome appName={theme.branding.appName} logoUrl={theme.branding.logoLightUrl} banners={theme.banners} />;
}
