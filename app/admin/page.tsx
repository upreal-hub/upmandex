import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/authorization";

import AdminClient from "./AdminClient";

export default async function AdminPage() {
  if (!(await isCurrentUserAdmin())) {
    redirect("/");
  }

  return <AdminClient />;
}
