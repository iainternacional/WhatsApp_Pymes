import { prisma, DEMO_TENANT_ID } from "@/lib/db";

type DemoConv = {
  contactName: string;
  phone: string;
  channelType: "whatsapp" | "instagram" | "messenger";
  agentSpecialty?: string | null;
  intent: string;
  sentiment: string;
  priority: string;
  isOpportunity: boolean;
  opportunityValue: number | null;
  hoursAgo: number;
  unread: number;
  messages: Array<{ direction: "in" | "out"; text: string; minutesAgo: number; type?: string; transcription?: string }>;
};

const DEMO_CONVS: DemoConv[] = [
  {
    contactName: "Carlos Méndez",
    phone: "5215512340001",
    channelType: "whatsapp",
    agentSpecialty: null,
    intent: "pedido",
    sentiment: "neutro",
    priority: "alta",
    isOpportunity: true,
    opportunityValue: 480,
    hoursAgo: 0.1,
    unread: 2,
    messages: [
      { direction: "in", text: "Hola buenas tardes, quería pedir 2 pizzas grandes margarita y una hawaiana", minutesAgo: 6 },
      { direction: "in", text: "Es para entrega a la calle Reforma 123 col. Centro", minutesAgo: 5 },
    ],
  },
  {
    contactName: "Laura Pérez",
    phone: "5215512340002",
    channelType: "whatsapp",
    agentSpecialty: "reservas",
    intent: "reserva",
    sentiment: "positivo",
    priority: "alta",
    isOpportunity: true,
    opportunityValue: 1200,
    hoursAgo: 0.5,
    unread: 0,
    messages: [
      { direction: "in", text: "Hola! quería reservar mesa para 6 personas el sábado a las 9pm", minutesAgo: 32 },
      { direction: "out", text: "¡Claro que sí Laura! Tenemos disponibilidad. ¿Sería para celebrar alguna ocasión especial?", minutesAgo: 30 },
      { direction: "in", text: "Si, el cumpleaños de mi mamá", minutesAgo: 28 },
      { direction: "out", text: "Qué lindo! Reservada la mesa 7 a las 9pm. ¿Te preparamos algo dulce para sorprenderla?", minutesAgo: 27 },
    ],
  },
  {
    contactName: "Diego Ramírez",
    phone: "5215512340003",
    channelType: "whatsapp",
    agentSpecialty: "quejas",
    intent: "queja",
    sentiment: "negativo",
    priority: "urgente",
    isOpportunity: false,
    opportunityValue: null,
    hoursAgo: 0.05,
    unread: 3,
    messages: [
      { direction: "in", text: "Oigan! la pizza me llegó toda fría", minutesAgo: 4 },
      { direction: "in", text: "Y la cocacola estaba caliente", minutesAgo: 3 },
      { direction: "in", text: "Tardaron una hora y media, qué mal servicio", minutesAgo: 2 },
    ],
  },
  {
    contactName: "Sofía Hernández",
    phone: "5215512340004",
    channelType: "instagram",
    agentSpecialty: null,
    intent: "consulta",
    sentiment: "neutro",
    priority: "normal",
    isOpportunity: true,
    opportunityValue: 320,
    hoursAgo: 1,
    unread: 1,
    messages: [
      { direction: "in", text: "Hola vi su anuncio en stories, cuánto cuesta la lasaña?", minutesAgo: 60 },
    ],
  },
  {
    contactName: "Andrés Castro",
    phone: "5215512340005",
    channelType: "whatsapp",
    agentSpecialty: null,
    intent: "agradecimiento",
    sentiment: "positivo",
    priority: "baja",
    isOpportunity: false,
    opportunityValue: null,
    hoursAgo: 2,
    unread: 0,
    messages: [
      { direction: "in", text: "Excelente todo! Súper rica la comida 10/10", minutesAgo: 120 },
      { direction: "out", text: "¡Mil gracias Andrés! Nos hace muy felices leer eso. Te esperamos pronto 🍕", minutesAgo: 119 },
    ],
  },
  {
    contactName: "Patricia Luna",
    phone: "5215512340006",
    channelType: "messenger",
    agentSpecialty: null,
    intent: "consulta",
    sentiment: "neutro",
    priority: "normal",
    isOpportunity: true,
    opportunityValue: 250,
    hoursAgo: 3,
    unread: 1,
    messages: [
      { direction: "in", text: "Buenas, me pueden compartir el menú?", minutesAgo: 180 },
    ],
  },
  {
    contactName: "Mario Vega",
    phone: "5215512340007",
    channelType: "whatsapp",
    agentSpecialty: null,
    intent: "pedido",
    sentiment: "neutro",
    priority: "alta",
    isOpportunity: true,
    opportunityValue: 850,
    hoursAgo: 4,
    unread: 0,
    messages: [
      {
        direction: "in",
        text: "[Nota de voz]",
        type: "audio",
        transcription:
          "Hola buenas, quería pedir dos hamburguesas dobles, una con queso extra y otra sin cebolla, además unas papas grandes y dos cocas, todo para entrega a Insurgentes 456, por favor lo más rápido posible.",
        minutesAgo: 240,
      },
      { direction: "out", text: "¡Pedido recibido Mario! 2 hamburguesas (queso extra / sin cebolla), papas grandes y 2 cocas. Salida en 25 min a Insurgentes 456 ✅", minutesAgo: 238 },
    ],
  },
  {
    contactName: "Camila Ortiz",
    phone: "5215512340008",
    channelType: "instagram",
    agentSpecialty: null,
    intent: "consulta",
    sentiment: "neutro",
    priority: "normal",
    isOpportunity: true,
    opportunityValue: 600,
    hoursAgo: 5,
    unread: 1,
    messages: [
      { direction: "in", text: "Tienen opciones vegetarianas? somos 4 personas", minutesAgo: 300 },
    ],
  },
  {
    contactName: "Roberto Salinas",
    phone: "5215512340009",
    channelType: "whatsapp",
    agentSpecialty: "pedidos",
    intent: "pedido",
    sentiment: "positivo",
    priority: "alta",
    isOpportunity: true,
    opportunityValue: 720,
    hoursAgo: 6,
    unread: 0,
    messages: [
      { direction: "in", text: "Quiero ordenar 3 pizzas familiares para el cumpleaños de mi hija", minutesAgo: 360 },
      { direction: "out", text: "¡Felicidades para tu hija Roberto! Te recomiendo nuestras 3 favoritas: Margarita, Pepperoni y Hawaiana. ¿Hora de entrega?", minutesAgo: 358 },
      { direction: "in", text: "A las 7pm porfa", minutesAgo: 355 },
      { direction: "out", text: "Listo! Salen a las 6:30pm para llegar a las 7pm. Total $720. ¿Pago en efectivo o tarjeta?", minutesAgo: 354 },
    ],
  },
  {
    contactName: "Valentina Cruz",
    phone: "5215512340010",
    channelType: "whatsapp",
    agentSpecialty: null,
    intent: "pedido",
    sentiment: "neutro",
    priority: "alta",
    isOpportunity: true,
    opportunityValue: 450,
    hoursAgo: 0.3,
    unread: 1,
    messages: [
      { direction: "in", text: "Pueden mandar 1 ensalada césar grande y 1 spaghetti a la boloñesa? entrega a Polanco", minutesAgo: 18 },
    ],
  },
];

export async function seedDemo() {
  await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: {},
    create: {
      id: DEMO_TENANT_ID,
      name: "La Trattoria",
      niche: "restaurant",
      plan: "pro",
    },
  });

  // Canales
  const channelMap: Record<string, string> = {};
  for (const type of ["whatsapp", "instagram", "messenger"] as const) {
    const ch = await prisma.channel.upsert({
      where: { id: `${DEMO_TENANT_ID}-${type}-main` },
      update: {},
      create: {
        id: `${DEMO_TENANT_ID}-${type}-main`,
        tenantId: DEMO_TENANT_ID,
        type,
        identifier:
          type === "whatsapp" ? "+52 55 1234 5678" : type === "instagram" ? "@latrattoria_mx" : "La Trattoria MX",
        status: type === "whatsapp" ? "disconnected" : "connected",
      },
    });
    channelMap[type] = ch.id;
  }

  // Agentes
  const agentsData = [
    { id: "agent-maria", name: "María González", specialty: "reservas", status: "online", avgResponseSec: 45, conversationsHandled: 38 },
    { id: "agent-jorge", name: "Jorge Ramírez", specialty: "pedidos", status: "online", avgResponseSec: 65, conversationsHandled: 52 },
    { id: "agent-lucia", name: "Lucía Torres", specialty: "quejas", status: "busy", avgResponseSec: 90, conversationsHandled: 24 },
    { id: "agent-pedro", name: "Pedro Morales", specialty: "pedidos", status: "offline", avgResponseSec: 120, conversationsHandled: 18 },
  ];
  const agents: Record<string, string> = {};
  for (const a of agentsData) {
    const created = await prisma.agent.upsert({
      where: { id: a.id },
      update: { status: a.status },
      create: {
        id: a.id,
        tenantId: DEMO_TENANT_ID,
        name: a.name,
        specialty: a.specialty,
        status: a.status,
        avgResponseSec: a.avgResponseSec,
        conversationsHandled: a.conversationsHandled,
        role: "agent",
      },
    });
    agents[a.specialty] = created.id;
  }

  // Limpiar conversaciones previas
  await prisma.message.deleteMany({
    where: { conversation: { tenantId: DEMO_TENANT_ID } },
  });
  await prisma.conversation.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.contact.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });

  let total = 0;
  for (const c of DEMO_CONVS) {
    const contact = await prisma.contact.create({
      data: {
        id: `${DEMO_TENANT_ID}-${c.phone}`,
        tenantId: DEMO_TENANT_ID,
        name: c.contactName,
        phone: c.phone,
        handle: c.channelType === "whatsapp" ? null : `@${c.contactName.toLowerCase().replace(" ", ".")}`,
      },
    });

    const lastMsgMinutesAgo = Math.min(...c.messages.map((m) => m.minutesAgo));
    const conv = await prisma.conversation.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        channelId: channelMap[c.channelType],
        contactId: contact.id,
        agentId: c.agentSpecialty ? agents[c.agentSpecialty] ?? null : null,
        status: "open",
        intent: c.intent,
        sentiment: c.sentiment,
        priority: c.priority,
        isOpportunity: c.isOpportunity,
        opportunityValue: c.opportunityValue,
        unread: c.unread,
        lastMessageAt: new Date(Date.now() - lastMsgMinutesAgo * 60_000),
      },
    });

    for (const m of c.messages) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          direction: m.direction,
          type: m.type ?? "text",
          content: m.text,
          transcription: m.transcription,
          sentiment: m.direction === "in" ? c.sentiment : null,
          intent: m.direction === "in" ? c.intent : null,
          createdAt: new Date(Date.now() - m.minutesAgo * 60_000),
        },
      });
    }
    total += 1;
  }

  return { tenant: DEMO_TENANT_ID, conversations: total, agents: agentsData.length };
}
