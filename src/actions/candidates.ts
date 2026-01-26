'use server'

import { prisma } from '@/lib/prisma'

export async function getCandidates(partyId?: number) {
  const where = partyId ? { partyId } : {}
  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { party: true },
  })
  return JSON.parse(JSON.stringify(candidates))
}

export async function getCandidate(id: number) {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { party: true },
  })
  return JSON.parse(JSON.stringify(candidate))
}
