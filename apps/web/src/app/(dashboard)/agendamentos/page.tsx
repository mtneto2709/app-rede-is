import { requireFeature } from "@/lib/require-feature";
import { AppointmentsPageClient } from "./client";

export default async function AppointmentsPage() {
  await requireFeature("agendamentos");
  return <AppointmentsPageClient />;
}
