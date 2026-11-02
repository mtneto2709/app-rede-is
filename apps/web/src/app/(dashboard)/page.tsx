import { getCurrentTenantTheme } from "@/lib/theme";
import { DashboardHome } from "@/components/dashboard-home";

export default async function DashboardPage() {
  const theme = await getCurrentTenantTheme();
  return (
    <DashboardHome
      appName={theme.branding.appName}
      iconUrl={theme.branding.iconUrl}
      banners={theme.banners}
      bannerIntervalSeconds={theme.bannerIntervalSeconds}
      features={theme.features}
    />
  );
}
