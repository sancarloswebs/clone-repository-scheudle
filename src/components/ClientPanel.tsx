"use client";

import { useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { fetchCurrentUser } from "@/lib/client-auth";
import type { PublicUser } from "@/lib/types";

export function ClientPanel({ initialView, line }: { initialView: "semana" | "calendario"; line?: 1 | 2 }) {
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    void fetchCurrentUser().then((next) => {
      if (!next) {
        window.location.replace("/login");
        return;
      }
      setUser(next);
    });
  }, []);

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-slate-400">Ingresando al panel...</p>
      </main>
    );
  }

  return <Dashboard user={user} initialView={initialView} line={line ?? 1} />;
}
