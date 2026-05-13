"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Zap } from "lucide-react";
import { initials } from "@/lib/utils";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [pulsing, setPulsing] = useState(false);

  const simulate = async () => {
    setPulsing(true);
    try {
      await fetch("/api/simulate", { method: "POST", body: JSON.stringify({}) });
    } finally {
      setTimeout(() => setPulsing(false), 1500);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={simulate}
          className="gap-2"
        >
          <Zap className={`h-4 w-4 ${pulsing ? "text-emerald-500" : ""}`} />
          Simular mensaje entrante
        </Button>
        <button className="relative rounded-full p-2 hover:bg-accent">
          <Bell className="h-4 w-4" />
          <Badge variant="urgent" className="absolute -right-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]">
            3
          </Badge>
        </button>
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-emerald-500 text-white">
              {initials("La Trattoria")}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium leading-tight">La Trattoria</p>
            <p className="text-xs text-muted-foreground">Plan Pro</p>
          </div>
        </div>
      </div>
    </header>
  );
}
