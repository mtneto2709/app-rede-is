import { requireFeature } from "@/lib/require-feature";
import { AttendancesPageClient } from "./client";

export default async function AttendancesPage() {
  await requireFeature("atendimentos");
  return <AttendancesPageClient />;
}
