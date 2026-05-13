"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  Phone,
  PowerOff,
  QrCode,
  Smartphone,
} from "lucide-react";

type Status = {
  status: "disconnected" | "connecting" | "connected";
  qrDataUrl?: string;
  phone?: string;
  lastError?: string;
};

export default function ConnectPage() {
  const [s, setS] = useState<Status>({ status: "disconnected" });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const r = await fetch("/api/whatsapp/status", { cache: "no-store" });
      const j = await r.json();
      setS(j);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 2500);
    return () => clearInterval(i);
  }, []);

  const connect = async () => {
    setBusy(true);
    try {
      await fetch("/api/whatsapp/connect", { method: "POST" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch("/api/whatsapp/connect", { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Topbar
        title="Conectar WhatsApp"
        subtitle="Vincula tu número en 30 segundos · sin migrar nada"
      />
      <div className="flex flex-col gap-6 p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Estado actual</CardTitle>
                  <CardDescription>Tu canal principal de WhatsApp</CardDescription>
                </div>
                <Badge
                  variant={
                    s.status === "connected"
                      ? "success"
                      : s.status === "connecting"
                      ? "warning"
                      : "secondary"
                  }
                >
                  {s.status === "connected"
                    ? "Conectado"
                    : s.status === "connecting"
                    ? "Escaneando QR..."
                    : "Desconectado"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {s.status === "connected" ? (
                <div className="rounded-lg border bg-emerald-50/50 p-4 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <div>
                      <p className="font-semibold">WhatsApp vinculado</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> +{s.phone}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-slate-50 p-6 text-center dark:bg-slate-900/30">
                  <Smartphone className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 font-medium">Aún no has conectado tu WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    Mientras tanto, puedes explorar la demo con datos simulados.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {s.status !== "connected" ? (
                  <Button onClick={connect} disabled={busy} variant="gradient" className="flex-1">
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="h-4 w-4" />
                    )}
                    {s.status === "connecting" ? "Re-generar QR" : "Generar QR"}
                  </Button>
                ) : (
                  <Button
                    onClick={disconnect}
                    disabled={busy}
                    variant="outline"
                    className="flex-1"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4" />}
                    Desvincular
                  </Button>
                )}
              </div>

              {s.lastError && (
                <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">
                  {s.lastError}
                </p>
              )}
            </CardContent>
          </Card>

          {/* QR */}
          <Card>
            <CardHeader>
              <CardTitle>Escanea con tu teléfono</CardTitle>
              <CardDescription>
                Abre WhatsApp → Configuración → Dispositivos vinculados → Vincular dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed bg-slate-50 dark:bg-slate-900/30">
                {s.qrDataUrl ? (
                  <Image
                    src={s.qrDataUrl}
                    alt="QR de WhatsApp"
                    width={300}
                    height={300}
                    className="rounded-lg"
                    unoptimized
                  />
                ) : s.status === "connecting" ? (
                  <div className="text-center">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
                    <p className="mt-3 text-sm text-muted-foreground">Generando código...</p>
                  </div>
                ) : s.status === "connected" ? (
                  <div className="text-center">
                    <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
                    <p className="mt-3 font-medium">¡Ya estás conectado!</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <QrCode className="mx-auto h-16 w-16 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      Presiona "Generar QR" para empezar
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                ⚠️ Esta integración usa <strong>Baileys</strong> (cliente no oficial). Ideal para
                validación / MVP. Para producción de alto volumen, recomendamos migrar a WhatsApp
                Cloud API oficial.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Instrucciones */}
        <Card className="bg-slate-50 dark:bg-slate-900/30">
          <CardHeader>
            <CardTitle className="text-base">Cómo funciona la vinculación</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Step
              n="1"
              title="Genera el QR"
              desc="Presiona el botón Generar QR. El servidor abrirá una sesión segura."
            />
            <Step
              n="2"
              title="Escanea con tu celular"
              desc="Desde WhatsApp → Dispositivos vinculados → Vincular dispositivo."
            />
            <Step
              n="3"
              title="Listo, ya recibes mensajes"
              desc="Los mensajes entrantes aparecerán en tu bandeja con análisis IA en vivo."
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
        {n}
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
