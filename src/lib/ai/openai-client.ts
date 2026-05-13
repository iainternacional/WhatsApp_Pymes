import "server-only";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const voiceModel = process.env.OPENAI_VOICE_MODEL ?? "whisper-1";

const client = apiKey ? new OpenAI({ apiKey }) : null;

export type MessageAnalysis = {
  intent: "pedido" | "reserva" | "consulta" | "queja" | "venta" | "agradecimiento" | "otro";
  sentiment: "positivo" | "neutro" | "negativo";
  priority: "baja" | "normal" | "alta" | "urgente";
  isOpportunity: boolean;
  opportunityValue: number | null;
  suggestedReply: string;
  tags: string[];
};

const POSITIVE_HINTS = ["gracias", "excelente", "delicioso", "rico", "perfecto", "genial", "10/10"];
const NEGATIVE_HINTS = [
  "horrible",
  "pésimo",
  "pesimo",
  "fría",
  "frio",
  "frío",
  "demoró",
  "demoro",
  "tardó",
  "tardo",
  "queja",
  "reclamo",
  "asco",
  "malísimo",
  "malisimo",
];
const URGENT_HINTS = ["urgente", "ya", "ahora", "rápido", "rapido", "ahorita"];
const ORDER_HINTS = ["pedido", "ordenar", "pedir", "domicilio", "delivery", "envío", "envio", "pizza", "menú", "menu"];
const RESERVATION_HINTS = ["reserva", "reservar", "mesa", "agendar", "cita"];
const COMPLAINT_HINTS = ["queja", "reclamo", "horrible", "pésimo", "pesimo", "no llegó", "no llego", "frío"];

function heuristicAnalyze(text: string): MessageAnalysis {
  const lower = text.toLowerCase();
  const has = (arr: string[]) => arr.some((w) => lower.includes(w));

  const isComplaint = has(COMPLAINT_HINTS);
  const isOrder = has(ORDER_HINTS);
  const isReservation = has(RESERVATION_HINTS);
  const isUrgent = has(URGENT_HINTS);

  const intent: MessageAnalysis["intent"] = isComplaint
    ? "queja"
    : isOrder
    ? "pedido"
    : isReservation
    ? "reserva"
    : has(["cuánto", "cuanto", "precio", "costo"])
    ? "consulta"
    : has(["gracias", "excelente"])
    ? "agradecimiento"
    : "otro";

  const sentiment: MessageAnalysis["sentiment"] = has(NEGATIVE_HINTS)
    ? "negativo"
    : has(POSITIVE_HINTS)
    ? "positivo"
    : "neutro";

  const priority: MessageAnalysis["priority"] = isComplaint
    ? "urgente"
    : isUrgent
    ? "alta"
    : isOrder || isReservation
    ? "alta"
    : "normal";

  const isOpportunity = isOrder || isReservation;
  const opportunityValue = isOrder ? 380 : isReservation ? 800 : null;

  const suggestedReply = isComplaint
    ? "Lamento mucho lo que pasó. Voy a revisar tu caso ahora mismo. ¿Me podrías dar más detalles para resolverlo de inmediato?"
    : isOrder
    ? "¡Con gusto te tomamos el pedido! ¿Me confirmas qué te gustaría ordenar y la dirección de entrega?"
    : isReservation
    ? "¡Claro que sí! ¿Para qué día y hora te gustaría reservar, y cuántas personas serían?"
    : "¡Hola! Gracias por escribirnos a La Trattoria. ¿En qué te podemos ayudar hoy?";

  const tags: string[] = [];
  if (isUrgent) tags.push("urgente");
  if (isOrder) tags.push("pedido");
  if (isReservation) tags.push("reserva");
  if (isComplaint) tags.push("queja");

  return { intent, sentiment, priority, isOpportunity, opportunityValue, suggestedReply, tags };
}

export async function analyzeMessage(text: string): Promise<MessageAnalysis> {
  if (!client) return heuristicAnalyze(text);

  try {
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `Eres un analista conversacional para un restaurante en LATAM. Analiza el mensaje del cliente y responde SOLO con JSON con las claves:
intent (pedido|reserva|consulta|queja|venta|agradecimiento|otro),
sentiment (positivo|neutro|negativo),
priority (baja|normal|alta|urgente),
isOpportunity (boolean: true si hay potencial de venta inmediato),
opportunityValue (number en MXN estimado o null),
suggestedReply (string, breve, cálido, en español, listo para enviar al cliente),
tags (array de strings cortos).`,
        },
        { role: "user", content: text },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return heuristicAnalyze(text);
    const parsed = JSON.parse(raw);
    return {
      intent: parsed.intent ?? "otro",
      sentiment: parsed.sentiment ?? "neutro",
      priority: parsed.priority ?? "normal",
      isOpportunity: !!parsed.isOpportunity,
      opportunityValue:
        typeof parsed.opportunityValue === "number" ? parsed.opportunityValue : null,
      suggestedReply: parsed.suggestedReply ?? "",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (err) {
    console.warn("[AI] Falling back to heuristic:", (err as Error).message);
    return heuristicAnalyze(text);
  }
}

export async function transcribeAudio(buffer: Buffer, filename = "audio.ogg"): Promise<string> {
  if (!client) {
    return "[Demo] Transcripción simulada: 'Hola, quería pedir dos pizzas margaritas para entrega a la calle 5 de mayo 123, lo más rápido posible por favor.'";
  }
  try {
    const file = new File([new Uint8Array(buffer)], filename, { type: "audio/ogg" });
    const result = await client.audio.transcriptions.create({
      model: voiceModel,
      file,
      language: "es",
    });
    return result.text;
  } catch (err) {
    console.warn("[AI] Whisper error:", (err as Error).message);
    return "[Error transcribiendo. Verifica tu OPENAI_API_KEY]";
  }
}

export function isAIEnabled() {
  return !!client;
}
