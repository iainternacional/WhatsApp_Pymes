# WhatsPyme — IA conversacional para restaurantes (MVP)

> Plataforma SaaS que convierte el WhatsApp de tu restaurante en una máquina de vender, con copiloto IA, bandeja multicanal y analítica accionable.

**MVP funcional** listo para demo en < 2 minutos.

---

## ¿Por qué es diferente?

A diferencia de los "CRM glorificados" para WhatsApp, **WhatsPyme está hecho pensando como restaurantero**:

- **Notas de voz transcritas**: en LATAM el 70% de los pedidos llegan por audio. Las leemos automáticamente.
- **Oportunidades perdidas en pesos**: te decimos exacto cuánto dinero dejaste de ganar por no contestar a tiempo.
- **Multi-mesero, un solo número**: la IA reparte chats por especialidad (pedidos / reservas / quejas) y carga.
- **Bandeja unificada**: WhatsApp + Instagram DM + Messenger en una sola pantalla.
- **Funciona sin OpenAI**: la IA tiene un fallback heurístico para demos sin gastar tokens.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Radix + Lucide |
| Backend | Next.js API Routes (Node runtime) |
| DB | SQLite + Prisma 5 |
| WhatsApp | `@whiskeysockets/baileys` (cliente no oficial — ideal MVP) |
| IA | OpenAI `gpt-4o-mini` (con fallback heurístico) + Whisper para voz |
| Gráficos | Recharts |
| Tiempo real | Server-Sent Events + polling reactivo |

---

## Instalación

```powershell
# 1. Instala dependencias
npm install

# 2. Crea tu base de datos local
npx prisma db push

# 3. (Opcional) Copia el .env.example y agrega tu OPENAI_API_KEY
copy .env.example .env

# 4. Arranca el dev server
npm run dev
```

Abre <http://localhost:3000>.

> El **dashboard se siembra solo** con datos de un restaurante demo ("La Trattoria") la primera vez que entres a `/dashboard`. No tienes que correr ningún script manual.

---

## Demo en 30 segundos

1. Entra a `/dashboard` — verás KPIs, oportunidades sin atender y conversaciones activas.
2. Ve a **Bandeja** y abre cualquier chat. Pulsa el ícono de **chispa** (✨) para que la IA sugiera respuesta.
3. Asigna automáticamente con el botón **"Asignar automáticamente"**: la IA elige al mejor mesero.
4. Sube una **nota de voz** con el ícono 🎤 → se transcribe automáticamente.
5. Click en **"Simular mensaje entrante"** (arriba a la derecha) para ver cómo entra un mensaje nuevo en vivo.
6. Ve a **Analítica** para ver sentimiento, intenciones y dinero en riesgo.
7. Ve a **Conectar WhatsApp** → presiona **Generar QR** y escanea con tu celular para conectar tu WhatsApp real.

---

## Estructura

```
src/
├── app/
│   ├── page.tsx                  # Landing
│   ├── dashboard/
│   │   ├── page.tsx              # Vista general
│   │   ├── inbox/                # Bandeja multicanal
│   │   ├── analytics/            # Analítica conversacional
│   │   ├── agents/               # Multi-agente
│   │   └── connect/              # QR Baileys
│   └── api/                      # Endpoints
│       ├── whatsapp/             # connect, status, send
│       ├── conversations/        # listado y detalle
│       ├── ai/                   # suggest, transcribe
│       ├── analytics/            # KPIs y series
│       ├── agents/               # CRUD + auto-assign
│       ├── simulate/             # genera mensajes demo
│       ├── stream/               # SSE realtime
│       └── seed/                 # reset demo
├── components/
│   ├── ui/                       # shadcn-style
│   └── layout/                   # Sidebar, Topbar
├── lib/
│   ├── whatsapp/baileys-client.ts
│   ├── ai/openai-client.ts
│   ├── db.ts
│   ├── seed.ts
│   └── utils.ts
prisma/
└── schema.prisma
```

---

## Roadmap próximo (post-MVP)

- [ ] Auth real (Clerk / NextAuth) y multi-tenant completo
- [ ] WhatsApp Cloud API oficial como alternativa a Baileys
- [ ] Stripe / Mercado Pago para suscripciones
- [ ] Pipeline de cierre / pedidos (kanban)
- [ ] Catálogo inteligente con búsqueda semántica
- [ ] Modo autopiloto fuera de horario con handoff humano
- [ ] App móvil React Native para los meseros

---

## Notas técnicas

- **Baileys** corre en el servidor Node (no funciona en serverless/Vercel-edge). Para producción dedicar un servidor o usar workers.
- El **fallback de IA** asegura que la demo funcione sin API key — perfecto para mostrar a clientes sin gasto.
- La integración WhatsApp es **stateful en memoria**; al reiniciar el server hay que re-escanear el QR (la sesión Baileys persiste en `./baileys-auth`).

---

Hecho con cariño en LATAM. MVP v0.1
