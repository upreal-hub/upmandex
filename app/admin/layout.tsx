import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/authorization";

import AdminShell from "./AdminShell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authorization = await requireAdmin();

  if (!authorization.ok) {
    redirect("/");
  }

  return (
    <AdminShell twitchLogin={authorization.user.twitchLogin}>
      {children}
    </AdminShell>
  );
}
