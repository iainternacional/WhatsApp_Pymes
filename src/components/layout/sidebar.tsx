"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Inbox,
  MessageCircle,
  QrCode,
  Settings,
  Sparkles,
  Users,
  Home,
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "Vista general", icon: Home },
  { href: "/dashboard/inbox", label: "Bandeja", icon: Inbox },
  { href: "/dashboard/analytics", label: "Analítica", icon: BarChart3 },
  { href: "/dashboard/agents", label: "Agentes", icon: Users },
  { href: "/dashboard/connect", label: "Conectar WhatsApp", icon: QrCode },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <Link href="/" className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
          <MessageCircle className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight">
          Whats<span className="text-emerald-600">Pyme</span>
        </span>
      </Link>

      <div className="flex flex-col gap-1 p-4">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Menú
        </p>
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto p-4">
        <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:from-emerald-950/30 dark:to-teal-950/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-semibold">Modo demo</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Datos de restaurante simulado. Conecta tu WhatsApp para ver mensajes reales.
          </p>
          <Link
            href="/dashboard/connect"
            className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Conectar ahora
          </Link>
        </div>
      </div>
    </aside>
  );
}
