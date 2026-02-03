import { auth } from "@clickqaassist/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import MeusFeedbacks from "./meus-feedbacks";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  return <MeusFeedbacks />;
}
