"use client";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

import type { Session } from "@clickqaassist/auth";

export default function Dashboard({ session }: { session: Session }) {
  const privateData = useQuery(trpc.privateData.queryOptions());

  return (
    <>
      <p>API: {privateData.data?.message}</p>
    </>
  );
}
