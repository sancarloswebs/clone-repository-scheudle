import { Dashboard } from "@/components/Dashboard";
import { getActor } from "@/lib/actor";
import { ensureDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  await ensureDemoData();
  const user = await getActor();
  const params = await searchParams;
  const initialView = params.vista === "calendario" || params.vista === "b" ? "calendario" : "semana";
  return <Dashboard user={user} initialView={initialView} />;
}
