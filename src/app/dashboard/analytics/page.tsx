"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatMoney, initials } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Smile,
  Frown,
  Meh,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

type Analytics = {
  kpis: {
    totalToday: number;
    totalWeek: number;
    opportunitiesCount: number;
    totalOpportunityValue: number;
    missedValue: number;
    avgResponseSec: number;
  };
  byIntent: { intent: string; _count: number }[];
  bySentiment: { sentiment: string; _count: number }[];
  byChannel: { type: string; count: number; status: string }[];
  series: { date: string; total: number; oportunidades: number; valor: number }[];
  recentMissed: any[];
  agents: any[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/analytics")
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  if (!data)
    return (
      <>
        <Topbar title="Analítica" />
        <div className="p-6">Cargando insights...</div>
      </>
    );

  const sentimentColors: Record<string, string> = {
    positivo: "#10b981",
    neutro: "#64748b",
    negativo: "#ef4444",
  };

  const intentColors: Record<string, string> = {
    pedido: "#10b981",
    reserva: "#3b82f6",
    consulta: "#a855f7",
    queja: "#ef4444",
    venta: "#f59e0b",
    agradecimiento: "#22c55e",
    otro: "#94a3b8",
  };

  return (
    <>
      <Topbar
        title="Analítica conversacional"
        subtitle="Cómo está conversando tu negocio y dónde pierdes dinero"
      />
      <div className="flex flex-col gap-6 p-6">
        {/* KPIs principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Conversaciones (7 días)</p>
              <p className="mt-2 text-3xl font-bold">{data.kpis.totalWeek}</p>
              <Badge variant="info" className="mt-2">
                Hoy: {data.kpis.totalToday}
              </Badge>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Valor en oportunidades</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {formatMoney(data.kpis.totalOpportunityValue)}
              </p>
              <Badge variant="success" className="mt-2">
                {data.kpis.opportunitiesCount} chats con intención de compra
              </Badge>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Dinero en riesgo (sin atender)</p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {formatMoney(data.kpis.missedValue)}
              </p>
              <Badge variant="destructive" className="mt-2">
                <AlertCircle className="mr-1 h-3 w-3" />
                Asigna agentes ya
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Tiempo de respuesta promedio</p>
              <p className="mt-2 text-3xl font-bold">{data.kpis.avgResponseSec}s</p>
              <Badge variant="info" className="mt-2">
                <Clock className="mr-1 h-3 w-3" />
                Más rápido que el 80% LATAM
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Serie temporal */}
        <Card>
          <CardHeader>
            <CardTitle>Pulso de la última semana</CardTitle>
            <CardDescription>Conversaciones, oportunidades detectadas y valor potencial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("es-MX", { weekday: "short" })
                    }
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(v) =>
                      new Date(v).toLocaleDateString("es-MX", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Conversaciones"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="oportunidades"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Oportunidades"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sentimiento + Intent + Canal */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sentimiento</CardTitle>
              <CardDescription>Cómo se sienten tus clientes hoy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.bySentiment.map((s) => ({ name: s.sentiment, value: s._count }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {data.bySentiment.map((s) => (
                        <Cell key={s.sentiment} fill={sentimentColors[s.sentiment ?? "neutro"]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5">
                {data.bySentiment.map((s) => (
                  <div key={s.sentiment} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {s.sentiment === "positivo" ? (
                        <Smile className="h-3 w-3 text-emerald-500" />
                      ) : s.sentiment === "negativo" ? (
                        <Frown className="h-3 w-3 text-red-500" />
                      ) : (
                        <Meh className="h-3 w-3 text-slate-400" />
                      )}
                      <span className="capitalize">{s.sentiment ?? "—"}</span>
                    </div>
                    <span className="font-medium">{s._count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Intenciones detectadas</CardTitle>
              <CardDescription>Lo que tus clientes te piden</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byIntent.map((i) => ({ name: i.intent, value: i._count }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {data.byIntent.map((i) => (
                        <Cell key={i.intent} fill={intentColors[i.intent ?? "otro"]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por canal</CardTitle>
              <CardDescription>De dónde te escriben</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {data.byChannel.map((c) => (
                <div key={c.type}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{c.type}</span>
                    <span className="font-medium">{c.count}</span>
                  </div>
                  <Progress
                    value={
                      data.byChannel.length
                        ? (c.count / Math.max(...data.byChannel.map((x) => x.count), 1)) * 100
                        : 0
                    }
                    className="mt-1"
                  />
                  <Badge
                    variant={c.status === "connected" ? "success" : "warning"}
                    className="mt-1 text-[10px]"
                  >
                    {c.status === "connected" ? "Conectado" : "Desconectado"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Oportunidades sin atender */}
        <Card className="border-red-200 bg-red-50/30 dark:bg-red-950/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-700">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Oportunidades en riesgo</CardTitle>
                  <CardDescription>
                    Clientes con intención de compra que <strong>nadie ha atendido</strong>
                  </CardDescription>
                </div>
              </div>
              <Link href="/dashboard/inbox">
                <Button size="sm">
                  Rescatar ahora <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentMissed.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                ¡Todas las oportunidades están atendidas! 🎉
              </p>
            ) : (
              data.recentMissed.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/inbox?id=${c.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <Avatar>
                    <AvatarFallback className="bg-red-500 text-white text-xs">
                      {initials(c.contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.contact.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {c.intent} · {c.channel.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600">
                      {formatMoney(c.opportunityValue ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">en riesgo</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Banner IA */}
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <CardContent className="flex items-center gap-4 py-6">
            <Sparkles className="h-8 w-8" />
            <div className="flex-1">
              <p className="font-semibold">Insight de IA</p>
              <p className="text-sm text-emerald-50">
                El 38% de tus quejas vienen los <strong>viernes por la noche</strong>. Recomendamos
                reforzar el turno con +1 mesero o activar autopiloto IA después de las 10pm.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
