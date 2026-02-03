import { auth } from "@clickqaassist/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DashboardPage from "./dashboard";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "leader") redirect("/dashboard");
  return <DashboardPage />;
}
