import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhatsPyme — IA conversacional para restaurantes",
  description:
    "Plataforma todo-en-uno para que restaurantes vendan más por WhatsApp con un copiloto de IA, bandeja multicanal y analítica accionable.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
