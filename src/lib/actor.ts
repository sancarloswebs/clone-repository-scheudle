import { requireUser } from "@/lib/auth";
import type { PublicUser } from "@/lib/types";

export async function getActor(): Promise<PublicUser> {
  return requireUser();
}
