import { Sidebar } from "@/components/layout/sidebar";
import { prisma, DEMO_TENANT_ID } from "@/lib/db";
import { seedDemo } from "@/lib/seed";

async function ensureDemoData() {
  const tenant = await prisma.tenant.findUnique({ where: { id: DEMO_TENANT_ID } });
  if (!tenant) {
    try {
      await seedDemo();
    } catch (err) {
      console.error("[seed] No se pudo inicializar la demo:", err);
    }
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDemoData();

  return (
    <div className="flex min-h-screen bg-slate-50/40 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
