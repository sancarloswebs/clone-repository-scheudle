import { redirect } from "next/navigation";
import { ensureDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureDemoData();
  redirect("/panel");
}
