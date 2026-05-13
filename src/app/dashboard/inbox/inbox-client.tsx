"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { initials, timeAgo, formatMoney } from "@/lib/utils";
import {
  Send,
  Sparkles,
  Mic,
  Instagram,
  Facebook,
  MessageCircle,
  TrendingUp,
  Search,
  UserCheck,
  Loader2,
  Volume2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";

type Conv = {
  id: string;
  status: string;
  intent: string | null;
  sentiment: string | null;
  priority: string;
  unread: number;
  isOpportunity: boolean;
  opportunityValue: number | null;
  lastMessageAt: string;
  contact: { id: string; name: string; phone: string | null; handle: string | null };
  channel: { id: string; type: string };
  agent: { id: string; name: string } | null;
  messages: Array<{ id: string; content: string; direction: string; createdAt: string }>;
};

type Message = {
  id: string;
  content: string;
  direction: "in" | "out";
  type: string;
  sentiment: string | null;
  intent: string | null;
  transcription: string | null;
  createdAt: string;
};

type DetailedConv = Omit<Conv, "messages"> & { messages: Message[] };

export default function InboxClient() {
  const params = useSearchParams();
  const preselectedId = params.get("id");

  const [conversations, setConversations] = useState<Conv[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId);
  const [detail, setDetail] = useState<DetailedConv | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    suggestedReply: string;
    intent: string;
    sentiment: string;
    isOpportunity: boolean;
    opportunityValue: number | null;
    tags: string[];
  } | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch(`/api/conversations?channel=${channelFilter}`);
    const json = await res.json();
    setConversations(json.conversations ?? []);
  }, [channelFilter]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    const json = await res.json();
    if (json.conversation) setDetail(json.conversation);
  }, []);

  useEffect(() => {
    loadConversations();
    const i = setInterval(loadConversations, 4000);
    return () => clearInterval(i);
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
      const i = setInterval(() => loadDetail(selectedId), 3000);
      return () => clearInterval(i);
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!selectedId && conversations.length) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [detail?.messages.length]);

  const filtered = useMemo(() => {
    if (!search) return conversations;
    const s = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.contact.name.toLowerCase().includes(s) ||
        c.messages[0]?.content?.toLowerCase().includes(s)
    );
  }, [conversations, search]);

  const handleSend = async () => {
    if (!detail || !draft.trim()) return;
    setSending(true);
    try {
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: detail.id, text: draft.trim() }),
      });
      setDraft("");
      setAiSuggestion(null);
      await loadDetail(detail.id);
    } finally {
      setSending(false);
    }
  };

  const handleAISuggest = async () => {
    console.log("[ai-suggest] click", { detailId: detail?.id });
    if (!detail) {
      setAiError("Selecciona una conversación primero");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: detail.id }),
      });
      console.log("[ai-suggest] status", res.status);
      const json = await res.json();
      console.log("[ai-suggest] response", json);
      if (!res.ok || json.error) {
        setAiError(json.error ?? `Error ${res.status}`);
        return;
      }
      const reply = json.analysis?.suggestedReply;
      if (!reply) {
        setAiError("La IA no generó respuesta. Intenta de nuevo.");
        return;
      }
      setAiSuggestion(json.analysis);
      setDraft(reply);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      console.error("[ai-suggest] error", err);
      setAiError(`No se pudo contactar a la IA: ${(err as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const acceptSuggestion = () => {
    if (!aiSuggestion) return;
    setDraft(aiSuggestion.suggestedReply);
    setAiSuggestion(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const dismissSuggestion = () => {
    setAiSuggestion(null);
    setAiError(null);
  };

  const handleAutoAssign = async () => {
    if (!detail) return;
    await fetch("/api/agents/auto-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: detail.id }),
    });
    await loadDetail(detail.id);
    await loadConversations();
  };

  const handleTranscribe = async (file: File) => {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("audio", file);
      const res = await fetch("/api/ai/transcribe", { method: "POST", body: fd });
      const json = await res.json();
      setDraft(json.text);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <>
      <Topbar
        title="Bandeja unificada"
        subtitle="Todos tus canales en un solo lugar, con IA al lado"
      />
      <div className="grid h-[calc(100vh-4rem)] grid-cols-[320px_1fr_360px] overflow-hidden">
        {/* Lista */}
        <div className="flex flex-col border-r bg-card">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs
              defaultValue="all"
              className="mt-3"
              onValueChange={(v) => setChannelFilter(v)}
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="whatsapp">
                  <MessageCircle className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="instagram">
                  <Instagram className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="messenger">
                  <Facebook className="h-3.5 w-3.5" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {filtered.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No hay conversaciones en este canal.
                </p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent ${
                      c.id === selectedId ? "bg-emerald-50/60 dark:bg-emerald-950/30" : ""
                    }`}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback
                          className={`text-white text-xs ${channelColor(c.channel.type)}`}
                        >
                          {initials(c.contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <ChannelDot type={c.channel.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate font-medium">{c.contact.name}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(c.lastMessageAt)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.messages[0]?.content ?? "Sin mensajes"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {c.priority === "urgente" && <Badge variant="urgent">Urgente</Badge>}
                        {c.isOpportunity && c.opportunityValue && (
                          <Badge variant="success" className="text-[10px]">
                            {formatMoney(c.opportunityValue)}
                          </Badge>
                        )}
                        {c.intent && (
                          <Badge variant="info" className="text-[10px] capitalize">
                            {c.intent}
                          </Badge>
                        )}
                        {c.unread > 0 && (
                          <Badge variant="urgent" className="ml-auto h-4 min-w-4 justify-center px-1 text-[10px]">
                            {c.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Conversación */}
        <div className="flex min-w-0 flex-col bg-slate-50/40 dark:bg-slate-950/40">
          {detail ? (
            <>
              <div className="flex h-16 items-center gap-3 border-b bg-card px-4">
                <Avatar>
                  <AvatarFallback className={`text-white text-xs ${channelColor(detail.channel.type)}`}>
                    {initials(detail.contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{detail.contact.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {detail.channel.type} · {detail.contact.phone ?? detail.contact.handle}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!detail.agent && (
                    <Button size="sm" variant="outline" onClick={handleAutoAssign}>
                      <UserCheck className="h-4 w-4" />
                      Asignar automáticamente
                    </Button>
                  )}
                  {detail.agent && (
                    <Badge variant="info" className="gap-1">
                      <UserCheck className="h-3 w-3" />
                      {detail.agent.name}
                    </Badge>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto flex max-w-3xl flex-col gap-3">
                  {detail.messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                </div>
              </div>

              <div className="border-t bg-card p-3">
                {aiError && (
                  <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="flex-1">{aiError}</p>
                    <button onClick={() => setAiError(null)} className="opacity-70 hover:opacity-100">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {aiSuggestion && (
                  <div className="mb-2 overflow-hidden rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm dark:from-emerald-950/40 dark:to-teal-950/40">
                    <div className="flex items-center justify-between border-b border-emerald-200/50 bg-emerald-100/40 px-3 py-2 dark:bg-emerald-900/30">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Sugerencia del copiloto IA
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="info" className="text-[10px] capitalize">
                          {aiSuggestion.intent}
                        </Badge>
                        <Badge
                          variant={
                            aiSuggestion.sentiment === "positivo"
                              ? "success"
                              : aiSuggestion.sentiment === "negativo"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] capitalize"
                        >
                          {aiSuggestion.sentiment}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                        "{aiSuggestion.suggestedReply}"
                      </p>
                      {aiSuggestion.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {aiSuggestion.tags.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">
                              #{t}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="gradient" onClick={acceptSuggestion}>
                          <Check className="h-3.5 w-3.5" />
                          Usar esta respuesta
                        </Button>
                        <Button size="sm" variant="outline" onClick={dismissSuggestion}>
                          <X className="h-3.5 w-3.5" />
                          Descartar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleAISuggest} disabled={aiLoading}>
                          {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Otra sugerencia
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleAISuggest}
                    disabled={aiLoading}
                    title="Sugerir respuesta con IA"
                  >
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-emerald-600" />}
                  </Button>
                  <label
                    className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border bg-background hover:bg-accent"
                    title="Subir nota de voz para transcribir"
                  >
                    {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleTranscribe(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <Input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Escribe una respuesta..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button onClick={handleSend} disabled={sending || !draft.trim()} variant="gradient">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Selecciona una conversación
            </div>
          )}
        </div>

        {/* Panel IA contextual */}
        <div className="hidden border-l bg-card lg:flex lg:flex-col">
          {detail ? (
            <ScrollArea className="flex-1">
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Copiloto IA
                </p>
                <Separator className="my-3" />

                <InsightRow label="Intención">
                  <Badge variant="info" className="capitalize">
                    {detail.intent ?? "—"}
                  </Badge>
                </InsightRow>
                <InsightRow label="Sentimiento">
                  <Badge
                    variant={
                      detail.sentiment === "positivo"
                        ? "success"
                        : detail.sentiment === "negativo"
                        ? "destructive"
                        : "secondary"
                    }
                    className="capitalize"
                  >
                    {detail.sentiment ?? "—"}
                  </Badge>
                </InsightRow>
                <InsightRow label="Prioridad">
                  <Badge
                    variant={
                      detail.priority === "urgente"
                        ? "urgent"
                        : detail.priority === "alta"
                        ? "warning"
                        : "secondary"
                    }
                    className="capitalize"
                  >
                    {detail.priority}
                  </Badge>
                </InsightRow>
                {detail.isOpportunity && (
                  <Card className="my-3 border-emerald-200 bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm font-medium">Oportunidad detectada</p>
                    </div>
                    {detail.opportunityValue && (
                      <p className="mt-1 text-2xl font-bold text-emerald-600">
                        {formatMoney(detail.opportunityValue)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Valor estimado de cierre. Atender pronto aumenta conversión un 67%.
                    </p>
                  </Card>
                )}

                <Separator className="my-3" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Acciones rápidas
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={handleAISuggest} disabled={aiLoading}>
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    Sugerir respuesta
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAutoAssign}>
                    <UserCheck className="h-4 w-4" />
                    Asignar mejor agente
                  </Button>
                </div>

                <Separator className="my-3" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cliente
                </p>
                <div className="mt-2 text-sm">
                  <p className="font-medium">{detail.contact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {detail.contact.phone ?? detail.contact.handle}
                  </p>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              El copiloto IA aparece al abrir un chat
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function InsightRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOut = message.direction === "out";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isOut
            ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
            : "border bg-card"
        }`}
      >
        {message.type === "audio" && (
          <div className="mb-2 flex items-center gap-2 text-xs font-medium opacity-80">
            <Volume2 className="h-3.5 w-3.5" />
            Nota de voz · transcrita por IA
          </div>
        )}
        {message.transcription ? (
          <p className={isOut ? "" : "italic"}>{message.transcription}</p>
        ) : (
          <p>{message.content}</p>
        )}
        <div className={`mt-1 text-[10px] ${isOut ? "text-emerald-50" : "text-muted-foreground"}`}>
          {timeAgo(message.createdAt)}
          {!isOut && message.intent && ` · ${message.intent}`}
        </div>
      </div>
    </div>
  );
}

function channelColor(type: string) {
  switch (type) {
    case "whatsapp":
      return "bg-emerald-500";
    case "instagram":
      return "bg-gradient-to-br from-pink-500 to-orange-500";
    case "messenger":
      return "bg-blue-600";
    default:
      return "bg-slate-500";
  }
}

function ChannelDot({ type }: { type: string }) {
  const Icon =
    type === "whatsapp" ? MessageCircle : type === "instagram" ? Instagram : Facebook;
  return (
    <div
      className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card ${channelColor(
        type
      )}`}
    >
      <Icon className="h-2 w-2 text-white" />
    </div>
  );
}
