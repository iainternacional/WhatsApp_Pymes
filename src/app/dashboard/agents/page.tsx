"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { initials } from "@/lib/utils";
import { Plus, Trash2, UserCheck, Zap, Brain, Clock, Loader2 } from "lucide-react";

type Agent = {
  id: string;
  name: string;
  specialty: string | null;
  status: string;
  conversationsHandled: number;
  avgResponseSec: number;
  _count: { conversations: number };
};

const SPECIALTIES = [
  { value: "pedidos", label: "Pedidos" },
  { value: "reservas", label: "Reservas" },
  { value: "quejas", label: "Quejas" },
  { value: "ventas", label: "Ventas" },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState<string>("pedidos");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const r = await fetch("/api/agents");
    const j = await r.json();
    setAgents(j.agents ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const createAgent = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, specialty }),
      });
      setName("");
      await load();
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/agents?id=${id}`, { method: "DELETE" });
    await load();
  };

  const toggleStatus = async (a: Agent) => {
    const next =
      a.status === "online" ? "busy" : a.status === "busy" ? "offline" : "online";
    await fetch("/api/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, status: next }),
    });
    await load();
  };

  const totalLoad = agents.reduce((s, a) => s + a._count.conversations, 0);

  return (
    <>
      <Topbar
        title="Equipo & asignación inteligente"
        subtitle="Tu equipo trabajando como una orquesta, con la IA como directora"
      />
      <div className="flex flex-col gap-6 p-6">
        {/* Banner asignación inteligente */}
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Brain className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Asignación inteligente activa</p>
              <p className="text-sm text-emerald-50">
                La IA reparte los chats automáticamente según especialidad (pedidos / reservas /
                quejas) y carga actual. Tus meseros nunca pelean por un chat.
              </p>
            </div>
            <Badge variant="success" className="bg-white text-emerald-700">
              <Zap className="mr-1 h-3 w-3" />
              {totalLoad} chats activos
            </Badge>
          </CardContent>
        </Card>

        {/* Crear agente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agregar agente</CardTitle>
            <CardDescription>Invita a tus meseros, cajeros o administradores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium">Nombre</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Andrea Sánchez"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Especialidad</label>
                <select
                  className="block h-10 w-44 rounded-md border bg-background px-3 text-sm"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                >
                  {SPECIALTIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={createAgent} disabled={creating || !name.trim()} variant="gradient">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Agregar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de agentes */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-emerald-500 text-white">
                        {initials(a.name)}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => toggleStatus(a)}
                      className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card transition ${
                        a.status === "online"
                          ? "bg-emerald-500"
                          : a.status === "busy"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                      }`}
                      title="Click para cambiar estado"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {a.specialty ?? "general"}
                    </p>
                    <Badge
                      variant={a.status === "online" ? "success" : a.status === "busy" ? "warning" : "secondary"}
                      className="mt-1 text-[10px]"
                    >
                      {a.status}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(a.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Atendidos</p>
                    <p className="font-semibold">{a.conversationsHandled}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Resp. promedio</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {a.avgResponseSec}s
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Carga actual</span>
                    <span className="font-medium">{a._count.conversations} chats</span>
                  </div>
                  <Progress
                    value={Math.min((a._count.conversations / 10) * 100, 100)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cómo funciona */}
        <Card className="bg-slate-50 dark:bg-slate-900/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              Cómo decide la IA a quién asignar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              1️⃣ La IA analiza el <strong>último mensaje del cliente</strong> y detecta su intención
              (pedido, reserva, queja, consulta).
            </p>
            <p>
              2️⃣ Busca el agente con la <strong>especialidad correcta</strong> y la <strong>menor carga</strong> activa.
            </p>
            <p>
              3️⃣ Prioriza a los agentes <strong>en línea</strong> y desempata por <strong>tiempo de respuesta histórico</strong>.
            </p>
            <p>
              4️⃣ Si nadie tiene la especialidad, asigna al de menor carga y avisa con un nudge para
              aprender en el siguiente turno.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
