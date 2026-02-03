import { auth } from "@clickqaassist/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ImportChat from "./import-chat";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const user = session.user as { role?: string };
  if (user.role !== "admin" && user.role !== "leader") redirect("/dashboard");

  return <ImportChat />;
}
