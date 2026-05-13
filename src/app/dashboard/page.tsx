import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { prisma, DEMO_TENANT_ID } from "@/lib/db";
import { formatMoney, initials, timeAgo } from "@/lib/utils";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Inbox,
  MessageCircle,
  TrendingUp,
  Users,
  Sparkles,
} from "lucide-react";

async function getOverview() {
  const tenantId = DEMO_TENANT_ID;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [convosToday, opportunities, openConvs, agents, recent] = await Promise.all([
    prisma.conversation.count({ where: { tenantId, lastMessageAt: { gte: startOfDay } } }),
    prisma.conversation.aggregate({
      where: { tenantId, isOpportunity: true },
      _sum: { opportunityValue: true },
      _count: true,
    }),
    prisma.conversation.findMany({
      where: { tenantId, status: { in: ["open", "pending"] } },
      include: { contact: true, channel: true, agent: true, messages: { take: 1, orderBy: { createdAt: "desc" } } },
      orderBy: { lastMessageAt: "desc" },
      take: 6,
    }),
    prisma.agent.findMany({ where: { tenantId } }),
    prisma.conversation.findMany({
      where: { tenantId, isOpportunity: true, agentId: null },
      include: { contact: true, channel: true },
      orderBy: { opportunityValue: "desc" },
      take: 3,
    }),
  ]);

  return { convosToday, opportunities, openConvs, agents, recent };
}

export default async function DashboardHome() {
  const { convosToday, opportunities, openConvs, agents, recent } = await getOverview();
  const online = agents.filter((a) => a.status === "online").length;

  return (
    <>
      <Topbar
        title="Vista general"
        subtitle="Lo que está pasando ahora en tu restaurante"
      />
      <div className="flex flex-col gap-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Conversaciones hoy"
            value={convosToday.toString()}
            delta="+23%"
            icon={<MessageCircle className="h-4 w-4" />}
            iconBg="bg-blue-100 text-blue-700"
          />
          <KpiCard
            label="Oportunidades detectadas"
            value={formatMoney(opportunities._sum.opportunityValue ?? 0)}
            delta={`${opportunities._count} chats`}
            icon={<TrendingUp className="h-4 w-4" />}
            iconBg="bg-emerald-100 text-emerald-700"
          />
          <KpiCard
            label="Sin asignar"
            value={recent.length.toString()}
            delta="Requieren atención"
            icon={<Inbox className="h-4 w-4" />}
            iconBg="bg-amber-100 text-amber-700"
            urgent
          />
          <KpiCard
            label="Agentes en línea"
            value={`${online}/${agents.length}`}
            delta="Disponibles"
            icon={<Users className="h-4 w-4" />}
            iconBg="bg-purple-100 text-purple-700"
          />
        </div>

        {/* Oportunidades sin atender */}
        <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Oportunidades sin atender</CardTitle>
                  <CardDescription>
                    Clientes con intención de compra esperando respuesta. Cada minuto cuenta.
                  </CardDescription>
                </div>
              </div>
              <Link href="/dashboard/inbox">
                <Button variant="outline" size="sm">
                  Ver todas <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                ¡Sin oportunidades pendientes! Tu equipo está al día.
              </p>
            ) : (
              recent.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/inbox?id=${c.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <Avatar>
                    <AvatarFallback className="bg-amber-500 text-white text-sm">
                      {initials(c.contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{c.contact.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {c.channel.type}
                      </Badge>
                      {c.priority === "urgente" && <Badge variant="urgent">Urgente</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {timeAgo(c.lastMessageAt)} · Intención: <strong>{c.intent}</strong>
                    </p>
                  </div>
                  {c.opportunityValue && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">
                        {formatMoney(c.opportunityValue)}
                      </p>
                      <p className="text-xs text-muted-foreground">potencial</p>
                    </div>
                  )}
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversaciones recientes</CardTitle>
              <CardDescription>Lo último que ha pasado en tu bandeja</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {openConvs.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/inbox?id=${c.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-emerald-500 text-white text-xs">
                      {initials(c.contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.contact.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.messages[0]?.content ?? "Sin mensajes"}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <Badge variant="success" className="h-5 min-w-5 justify-center px-1.5">
                      {c.unread}
                    </Badge>
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equipo</CardTitle>
              <CardDescription>Carga de trabajo en tiempo real</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {agents.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                        {initials(a.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                        a.status === "online"
                          ? "bg-emerald-500"
                          : a.status === "busy"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {a.specialty ?? "general"} · {a.conversationsHandled} chats
                    </p>
                  </div>
                  <Badge variant={a.status === "online" ? "success" : a.status === "busy" ? "warning" : "secondary"}>
                    {a.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  delta,
  icon,
  iconBg,
  urgent,
}: {
  label: string;
  value: string;
  delta: string;
  icon: React.ReactNode;
  iconBg: string;
  urgent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
            {icon}
          </div>
        </div>
        <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
        <p className={`mt-1 text-xs ${urgent ? "text-amber-600" : "text-emerald-600"}`}>
          {delta}
        </p>
      </CardContent>
    </Card>
  );
}
