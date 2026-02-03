import { auth } from "@clickqaassist/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import UsersPage from "./users";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "admin") redirect("/dashboard");
  return <UsersPage />;
}
