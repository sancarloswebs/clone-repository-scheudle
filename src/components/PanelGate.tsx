"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { fetchCurrentUser } from "@/lib/client-auth";
import type { PublicUser } from "@/lib/types";

export function PanelGate() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    let active = true;
    void fetchCurrentUser().then((next) => {
      if (!active) return;
      if (!next) {
        router.replace("/login");
        return;
      }
      setUser(next);
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-slate-400">Ingresando al panel...</p>
      </main>
    );
  }

  return <Dashboard user={user} />;
}
