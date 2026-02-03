import { auth } from "@clickqaassist/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ChatView from "./chat-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "leader") redirect("/dashboard");
  const { id } = await params;
  return <ChatView chatId={id} />;
}
