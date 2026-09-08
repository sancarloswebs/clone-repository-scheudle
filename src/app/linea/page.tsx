import { LineSelector } from "@/components/LineSelector";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LineaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <LineSelector />;
}
