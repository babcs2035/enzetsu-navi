"use server";

import { prisma } from "@/lib/prisma";

export async function getParties() {
  const parties = await prisma.party.findMany({
    orderBy: { id: "asc" },
  });
  return JSON.parse(JSON.stringify(parties));
}

export async function getParty(id: number) {
  const party = await prisma.party.findUnique({
    where: { id },
  });
  return JSON.parse(JSON.stringify(party));
}
