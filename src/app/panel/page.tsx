import { Dashboard } from "@/components/Dashboard";
import { ClientPanel } from "@/components/ClientPanel";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; line?: string }>;
}) {
  const params = await searchParams;
  const initialView = params.vista === "calendario" || params.vista === "b" ? "calendario" : "semana";
  const line = params.line === "2" ? 2 : 1;
  try {
    const user = await getCurrentUser();
    if (user) return <Dashboard user={user} initialView={initialView} line={line} />;
  } catch {
    // fall through to client session
  }
  return <ClientPanel initialView={initialView} line={line} />;
}
