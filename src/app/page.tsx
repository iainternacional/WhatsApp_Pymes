import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Bot,
  Inbox,
  Mic,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  Check,
  Instagram,
  Facebook,
  MessageCircle,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Decorativos */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="blob absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-400" />
        <div className="blob absolute top-40 right-0 h-96 w-96 rounded-full bg-teal-400" />
        <div className="absolute inset-0 bg-grid opacity-30" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-30 w-full border-b bg-background/70 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Whats<span className="text-emerald-600">Pyme</span>
            </span>
          </Link>
          <nav className="hidden gap-8 text-sm font-medium md:flex">
            <a href="#features" className="text-muted-foreground hover:text-foreground">
              Producto
            </a>
            <a href="#how" className="text-muted-foreground hover:text-foreground">
              Cómo funciona
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground">
              Precios
            </a>
          </nav>
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">Entrar al demo</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="gradient">
                Probar gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 md:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="success" className="mb-6 px-3 py-1 text-xs">
            <Sparkles className="mr-1 h-3 w-3" /> Hecho para restaurantes de LATAM
          </Badge>
          <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            Tus meseros se cansan.
            <br />
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              Tu WhatsApp, no.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            La primera plataforma que <strong>escucha notas de voz</strong>, detecta{" "}
            <strong>oportunidades perdidas</strong> y reparte los chats entre tu equipo —
            todo en una bandeja con <strong>WhatsApp, Instagram y Messenger</strong>.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button size="lg" variant="gradient" className="text-base">
                Abrir demo en vivo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/connect">
              <Button size="lg" variant="outline" className="text-base">
                Vincular mi WhatsApp
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sin tarjeta · MVP funcional · Datos demo de un restaurante real precargados
          </p>
        </div>

        {/* Mock dashboard preview */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur-3xl" />
          <div className="rounded-2xl border bg-card p-2 shadow-2xl">
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50 p-8 dark:from-slate-900 dark:to-emerald-950">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Conversaciones hoy</p>
                  <p className="mt-2 text-3xl font-bold">142</p>
                  <p className="mt-1 text-xs text-emerald-600">+23% vs ayer</p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Oportunidades detectadas</p>
                  <p className="mt-2 text-3xl font-bold">$12,480</p>
                  <p className="mt-1 text-xs text-emerald-600">8 sin atender</p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Tiempo de respuesta</p>
                  <p className="mt-2 text-3xl font-bold">42s</p>
                  <p className="mt-1 text-xs text-emerald-600">↓ 3 min con IA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Por qué somos diferentes */}
      <section id="features" className="container py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="info" className="mb-4">¿Por qué WhatsPyme?</Badge>
          <h2 className="text-4xl font-bold tracking-tight">
            Las otras herramientas son <span className="line-through text-muted-foreground">CRMs glorificados</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Nosotros pensamos como restaurantero, no como software de oficina.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <FeatureCard
            icon={<Mic className="h-6 w-6" />}
            title="Notas de voz, leídas como texto"
            description="En LATAM el 70% de los pedidos llegan por audio. Las transcribimos, detectamos el pedido y le sugerimos respuesta al mesero antes de que termine de escucharlo."
            gradient="from-orange-500 to-red-500"
          />
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6" />}
            title="Oportunidades perdidas, en pesos"
            description="¿Cuánto dinero dejaste de ganar ayer por no contestar a tiempo? Te lo decimos exacto, con conversación, monto estimado y plantilla para recuperar al cliente."
            gradient="from-emerald-500 to-teal-600"
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Multi-mesero, un solo número"
            description="Tus tres turnos comparten el mismo WhatsApp sin pisarse. La IA reparte chats según especialidad (pedidos, reservas, quejas) y carga actual."
            gradient="from-blue-500 to-indigo-600"
          />
          <FeatureCard
            icon={<Inbox className="h-6 w-6" />}
            title="Bandeja unificada real"
            description="WhatsApp, Instagram DM y Messenger en una sola conversación por cliente. La doña que pide por Insta y luego por Whats es la misma — y tu sistema lo sabe."
            gradient="from-pink-500 to-rose-600"
          />
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="how" className="bg-slate-50 py-20 dark:bg-slate-900/50">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="info" className="mb-4">3 pasos</Badge>
            <h2 className="text-4xl font-bold tracking-tight">En 5 minutos estás vendiendo</h2>
          </div>
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Conecta tu WhatsApp",
                desc: "Escanea un QR con tu celular. Mismo número, sin migrar nada.",
                icon: <Zap className="h-5 w-5" />,
              },
              {
                step: "2",
                title: "Carga tu equipo",
                desc: "Invita a tus meseros o cajeros. La IA aprende quién es bueno en qué.",
                icon: <Users className="h-5 w-5" />,
              },
              {
                step: "3",
                title: "Deja que la IA trabaje",
                desc: "Sugiere respuestas, transcribe audios, prioriza urgencias. Tú solo confirmas.",
                icon: <Bot className="h-5 w-5" />,
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    {s.icon}
                  </div>
                  <span className="text-3xl font-bold text-muted-foreground/40">0{s.step}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Canales */}
      <section className="container py-20">
        <div className="rounded-3xl border bg-gradient-to-br from-emerald-50 to-teal-50 p-12 dark:from-emerald-950/30 dark:to-teal-950/30">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div>
              <h3 className="text-2xl font-bold">Todos los canales, una sola conversación</h3>
              <p className="mt-2 text-muted-foreground">
                Tu cliente no piensa en "canales". Tu equipo tampoco debería.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <ChannelIcon Icon={MessageCircle} color="bg-emerald-500" label="WhatsApp" />
              <ChannelIcon Icon={Instagram} color="bg-gradient-to-br from-pink-500 to-orange-500" label="Instagram" />
              <ChannelIcon Icon={Facebook} color="bg-blue-600" label="Messenger" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="info" className="mb-4">Planes</Badge>
          <h2 className="text-4xl font-bold tracking-tight">Pagas lo que tu negocio crece</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Empieza gratis. Sube cuando tus ventas suban.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          <PricingCard
            name="Starter"
            price="Gratis"
            description="Para taquerías, fondas y emprendimientos."
            features={[
              "1 número de WhatsApp",
              "1 agente",
              "100 conversaciones / mes",
              "IA con respuestas sugeridas",
              "Transcripción de audios (limitada)",
            ]}
            cta="Empezar gratis"
          />
          <PricingCard
            name="Pro"
            price="$599"
            priceSuffix="MXN / mes"
            description="Para restaurantes que ya venden por Whats."
            features={[
              "1 número, multi-canal",
              "Hasta 5 agentes",
              "Conversaciones ilimitadas",
              "IA + transcripción ilimitada",
              "Analytics de oportunidades",
              "Asignación inteligente",
            ]}
            cta="Probar 14 días"
            highlighted
          />
          <PricingCard
            name="Business"
            price="$1,499"
            priceSuffix="MXN / mes"
            description="Cadenas y franquicias."
            features={[
              "Múltiples sucursales",
              "Agentes ilimitados",
              "API y webhooks",
              "Soporte prioritario",
              "IA fine-tuneada a tu menú",
            ]}
            cta="Hablar con ventas"
          />
        </div>
      </section>

      {/* CTA final */}
      <section className="container pb-24">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 p-12 text-center text-white shadow-2xl shadow-emerald-500/30">
          <h2 className="text-4xl font-bold">¿Cuánto te cuesta no responder a tiempo?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-emerald-50">
            Los restaurantes pierden en promedio <strong>$8,200 MXN/mes</strong> en pedidos que llegan
            por WhatsApp y nadie contesta. WhatsPyme se paga solo en una semana.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="mt-8 bg-white text-emerald-700 hover:bg-emerald-50">
              Ver demo ahora <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t bg-background">
        <div className="container flex h-16 items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} WhatsPyme. Hecho con cariño en LATAM.</p>
          <p>MVP v0.1</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-shadow hover:shadow-lg">
      <div
        className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`}
      />
      <div
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}

function ChannelIcon({
  Icon,
  color,
  label,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${color} text-white shadow-lg`}>
        <Icon className="h-7 w-7" />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function PricingCard({
  name,
  price,
  priceSuffix,
  description,
  features,
  cta,
  highlighted,
}: {
  name: string;
  price: string;
  priceSuffix?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border bg-card p-8 shadow-sm transition-all ${
        highlighted
          ? "border-emerald-500/30 shadow-emerald-500/10 shadow-lg md:scale-105"
          : ""
      }`}
    >
      {highlighted && (
        <Badge variant="success" className="absolute -top-3 left-1/2 -translate-x-1/2">
          Más popular
        </Badge>
      )}
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-bold">{price}</span>
        {priceSuffix && <span className="text-sm text-muted-foreground">{priceSuffix}</span>}
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href="/dashboard" className="mt-8 block">
        <Button variant={highlighted ? "gradient" : "outline"} className="w-full">
          {cta}
        </Button>
      </Link>
    </div>
  );
}
