"use client";

import { Suspense } from "react";
import InboxClient from "./inbox-client";

export const dynamic = "force-dynamic";

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando bandeja...</div>}>
      <InboxClient />
    </Suspense>
  );
}
