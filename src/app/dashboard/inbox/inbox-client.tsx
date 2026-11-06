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
  ArrowLeft,
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
  // Resultado del último envío: indica si llegó por WhatsApp o solo se guardó local.
  const [sendResult, setSendResult] = useState<
    | { kind: "whatsapp"; externalId: string }
    | { kind: "local-only"; reason: string }
    | { kind: "error"; reason: string }
    | null
  >(null);
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
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  // Mensajes enviados que aún no confirma el servidor (envío optimista).
  const [pending, setPending] = useState<Message[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedListItemRef = useRef<HTMLButtonElement>(null);
  // Conversación activa: descarta respuestas de polling que llegan tarde.
  const activeIdRef = useRef<string | null>(selectedId);
  activeIdRef.current = selectedId;

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?channel=${channelFilter}`);
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } catch {
      // El siguiente ciclo de polling reintenta.
    }
  }, [channelFilter]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const json = await res.json();
      if (json.conversation && activeIdRef.current === id) setDetail(json.conversation);
    } catch {
      // El siguiente ciclo de polling reintenta.
    }
  }, []);

  // Polling solo con la pestaña visible; al volver se refresca de inmediato.
  useEffect(() => {
    loadConversations();
    const i = setInterval(() => {
      if (!document.hidden) loadConversations();
    }, 4000);
    const onVisible = () => {
      if (!document.hidden) loadConversations();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    loadDetail(selectedId);
    const i = setInterval(() => {
      if (!document.hidden) loadDetail(selectedId);
    }, 3000);
    return () => clearInterval(i);
  }, [selectedId, loadDetail]);

  // Al cambiar de chat se limpia todo el estado del compositor.
  useEffect(() => {
    setDraft("");
    setPending([]);
    setSendResult(null);
    setAiSuggestion(null);
    setAiError(null);
    setShowMobilePanel(false);
    setDetail((d) => (d && d.id !== selectedId ? null : d));
  }, [selectedId]);

  // Autoseleccionar el primer chat solo en pantallas con lista + chat a la vez;
  // en móvil hay que poder volver a la lista sin que se reabra otro chat.
  useEffect(() => {
    if (selectedId || !conversations.length) return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  // Ajusta la altura del textarea al contenido (máx. ~6 líneas).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [draft, detail?.id]);

  // Los pendientes se descartan cuando el servidor ya trae el mensaje.
  const serverMessages = detail?.messages;
  const allMessages = useMemo(() => {
    const server = serverMessages ?? [];
    // Margen de 5s por posible desfase de reloj entre cliente y servidor.
    const stillPending = pending.filter((p) => {
      const sentAt = new Date(p.createdAt).getTime() - 5000;
      return !server.some(
        (m) =>
          m.direction === "out" &&
          m.content === p.content &&
          new Date(m.createdAt).getTime() >= sentAt
      );
    });
    return [...server, ...stillPending];
  }, [serverMessages, pending]);

  // Scroll suave al final solo si el agente ya estaba leyendo el final del chat.
  useEffect(() => {
    if (!scrollRef.current || !messagesEndRef.current) return;
    const el = scrollRef.current;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 140) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [allMessages.length]);

  // Al cambiar de conversación siempre ir al último mensaje.
  useEffect(() => {
    if (!detail?.id || !messagesEndRef.current) return;
    // Dos pasadas: una inmediata y otra tras el primer paint del DOM.
    messagesEndRef.current.scrollIntoView({ block: "end" });
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    }, 60);
    return () => clearTimeout(t);
  }, [detail?.id]);

  useEffect(() => {
    // Mantener visible en la lista el chat actualmente seleccionado.
    if (!selectedId || !selectedListItemRef.current) return;
    selectedListItemRef.current.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedId, conversations.length, channelFilter, search]);

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
    const text = draft.trim();
    if (!detail || !text || sending) return;
    const conversationId = detail.id;
    const tempId = `tmp-${Date.now()}`;
    setSending(true);
    setSendResult(null);
    // Envío optimista: el mensaje aparece al instante y el campo queda libre.
    setPending((p) => [
      ...p,
      {
        id: tempId,
        content: text,
        direction: "out",
        type: "text",
        sentiment: null,
        intent: null,
        transcription: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
    setAiSuggestion(null);
    const rollback = () => {
      setPending((p) => p.filter((m) => m.id !== tempId));
      // Devuelve el texto al campo para reintentar sin reescribir.
      setDraft((d) => d || text);
    };
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, text }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        rollback();
        setSendResult({
          kind: "error",
          reason: json?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      await loadDetail(conversationId);
      setPending((p) => p.filter((m) => m.id !== tempId));

      if (json.delivery?.mode === "whatsapp") {
        setSendResult({
          kind: "whatsapp",
          externalId: json.delivery.externalId,
        });
        // Auto-cerramos el banner de éxito real, no el de fallo.
        setTimeout(() => setSendResult(null), 2500);
      } else {
        setSendResult({
          kind: "local-only",
          reason: json.delivery?.reason ?? "Motivo desconocido",
        });
      }
    } catch (err) {
      rollback();
      setSendResult({
        kind: "error",
        reason: (err as Error).message ?? "Error de red al enviar",
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleAISuggest = async () => {
    if (!detail) {
      setAiError("Selecciona una conversación primero");
      return;
    }
    setShowMobilePanel(false);
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: detail.id }),
      });
      const json = await res.json();
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
    setShowMobilePanel(false);
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
      if (!res.ok || !json.text) {
        setAiError(json.error ?? "No se pudo transcribir el audio");
        return;
      }
      setDraft((d) => (d ? `${d} ${json.text}` : json.text));
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      setAiError(`Error al transcribir: ${(err as Error).message}`);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    // Contenedor raíz: altura exacta del viewport, sin scroll de página.
    // Topbar shrink-0 + grid flex-1 garantizan que el chat siempre tenga sitio,
    // sin depender de un cálculo manual contra `4rem`.
    // h-dvh: en móvil `100vh` ignora la barra del navegador y tapa el compositor.
    <div className="flex h-screen h-dvh flex-col overflow-hidden">
      <Topbar
        title="Bandeja unificada"
        subtitle="Todos tus canales en un solo lugar, con IA al lado"
      />
      {/*
        Breakpoints (considerando sidebar del dashboard de 256px en lg+):
        - móvil  (<md):       1 col, toggle lista ↔ chat
        - tablet (md, 768+):  2 col [260px + 1fr]
        - lg     (lg, 1024+): 2 col [260px + 1fr]  ← panel IA accesible vía toggle (poco ancho útil)
        - xl     (xl, 1280+): 3 col [280px + 1fr + 320px]  ← chat ≈ 440-680px
      */}
      {/* grid-rows-1 (minmax(0,1fr)): sin esto la fila crece al alto de la lista de chats y empuja el compositor fuera de pantalla. */}
      <div className="relative grid min-h-0 flex-1 grid-cols-1 grid-rows-1 overflow-hidden md:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_320px]">
        {/* Lista de conversaciones */}
        <div
          className={`min-h-0 flex-col border-r bg-card ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
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
          <ScrollArea className="min-h-0 flex-1">
            <div className="divide-y">
              {filtered.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No hay conversaciones en este canal.
                </p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    ref={c.id === selectedId ? selectedListItemRef : null}
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

        {/* Panel de conversación */}
        <div
          className={`min-h-0 min-w-0 flex-col bg-slate-50/40 dark:bg-slate-950/40 ${
            selectedId ? "flex" : "hidden md:flex"
          }`}
        >
          {detail ? (
            <>
              <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-3 md:h-16 md:gap-3 md:px-4">
                {/* Botón volver — solo en móvil */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 md:hidden"
                  onClick={() => setSelectedId(null)}
                  title="Volver a conversaciones"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <Avatar className="h-8 w-8 shrink-0 md:h-10 md:w-10">
                  <AvatarFallback className={`text-white text-xs ${channelColor(detail.channel.type)}`}>
                    {initials(detail.contact.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold md:text-base">
                    {detail.contact.name}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground capitalize md:text-xs">
                    {detail.channel.type}
                    {(detail.contact.phone ?? detail.contact.handle) && (
                      <> · {detail.contact.phone ?? detail.contact.handle}</>
                    )}
                  </p>
                </div>

                {/* Asignar: icono en tablet, texto completo en desktop */}
                {!detail.agent ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAutoAssign}
                    title="Asignar automáticamente"
                    className="shrink-0"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span className="hidden lg:inline">Asignar</span>
                  </Button>
                ) : (
                  <Badge variant="info" className="shrink-0 gap-1 text-xs">
                    <UserCheck className="h-3 w-3" />
                    <span className="hidden sm:inline">{detail.agent.name}</span>
                  </Badge>
                )}

                {/* Botón copiloto IA — visible <xl, oculto en xl (panel siempre visible) */}
                <Button
                  size="icon"
                  variant={showMobilePanel ? "default" : "outline"}
                  className="shrink-0 xl:hidden"
                  onClick={() => setShowMobilePanel((v) => !v)}
                  title="Copiloto IA"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>

              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 md:p-4"
              >
                <div className="mx-auto flex max-w-3xl flex-col gap-3">
                  {allMessages.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      Aún no hay mensajes en esta conversación.
                    </p>
                  )}
                  {allMessages.map((m) => (
                    <MessageBubble key={m.id} message={m} sending={m.id.startsWith("tmp-")} />
                  ))}
                  {/* Ancla al final: más fiable que scrollTop = scrollHeight */}
                  <div ref={messagesEndRef} className="h-px" />
                </div>
              </div>

              {/* Sin sticky: el flex-col del padre ya ubica el compositor abajo */}
              <div className="shrink-0 border-t bg-card p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:p-3 md:pb-3">
                {sendResult?.kind === "whatsapp" && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                    Mensaje entregado por WhatsApp.
                  </div>
                )}
                {sendResult?.kind === "local-only" && (
                  <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold">
                        Guardado en la conversación, pero NO se envió por WhatsApp
                      </p>
                      <p className="mt-0.5 opacity-90">{sendResult.reason}</p>
                    </div>
                    <button
                      onClick={() => setSendResult(null)}
                      className="opacity-70 hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {sendResult?.kind === "error" && (
                  <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/20 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="flex-1">
                      <span className="font-semibold">No se pudo enviar:</span>{" "}
                      {sendResult.reason}
                    </p>
                    <button
                      onClick={() => setSendResult(null)}
                      className="opacity-70 hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
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
                <div className="flex items-end gap-1.5 md:gap-2">
                  {/* Copiloto IA */}
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleAISuggest}
                    disabled={aiLoading}
                    title="Sugerir respuesta con IA"
                    className="shrink-0"
                  >
                    {aiLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Sparkles className="h-4 w-4 text-emerald-600" />}
                  </Button>

                  {/* Transcribir voz */}
                  <label
                    className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-background hover:bg-accent"
                    title="Subir nota de voz para transcribir"
                  >
                    {transcribing
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Mic className="h-4 w-4" />}
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

                  {/* Textarea autoajustable. Enter envía en escritorio; en móvil Enter
                      hace salto de línea (se envía con el botón). text-base evita el
                      zoom automático de iOS al enfocar. */}
                  <div className="min-w-0 flex-1">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Escribe una respuesta..."
                      enterKeyHint="send"
                      className="block max-h-36 min-h-10 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          !e.nativeEvent.isComposing &&
                          window.matchMedia("(min-width: 768px)").matches
                        ) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                  </div>

                  {/* Enviar */}
                  <Button
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    variant="gradient"
                    className="shrink-0"
                  >
                    {sending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />}
                    <span className="hidden md:inline">Enviar</span>
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

        {/* Fondo para cerrar el drawer tocando fuera (solo <xl) */}
        {showMobilePanel && (
          <button
            aria-label="Cerrar panel"
            className="absolute inset-0 z-20 bg-black/30 xl:hidden"
            onClick={() => setShowMobilePanel(false)}
          />
        )}
        {/* Panel IA contextual — drawer flotante en <xl, columna fija en xl+ */}
        <div
          className={`min-h-0 border-l bg-card flex-col ${
            showMobilePanel
              ? "absolute inset-y-0 right-0 z-30 flex w-[min(20rem,85vw)] shadow-2xl xl:relative xl:inset-auto xl:w-auto xl:shadow-none"
              : "hidden xl:flex"
          }`}
        >
          {detail ? (
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Copiloto IA
                  </p>
                  {/* Cerrar drawer en <xl */}
                  <button
                    className="rounded p-1 text-muted-foreground hover:bg-accent xl:hidden"
                    onClick={() => setShowMobilePanel(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
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
    </div>
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

function MessageBubble({ message, sending }: { message: Message; sending?: boolean }) {
  const isOut = message.direction === "out";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[75%] md:px-4 md:py-2.5 ${
          sending ? "opacity-70" : ""
        } ${
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
          {sending ? "Enviando…" : timeAgo(message.createdAt)}
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
