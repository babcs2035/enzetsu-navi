"use server";

import { addHours, subHours } from "date-fns";
import { prisma } from "@/lib/prisma";

interface SpeechParams {
  start_time?: string;
  end_time?: string;
  party_ids?: number[];
  candidate_ids?: number[];
  has_location?: boolean;
  limit?: number;
  offset?: number;
}

// レスポンス整形用ヘルパー．
// biome-ignore lint/suspicious/noExplicitAny: Prisma の型推論が複雑なため any を許容する．
function formatSpeech(s: any) {
  return {
    id: s.id,
    candidate_id: s.candidateId,
    candidate_name: s.candidate.name,
    party_id: s.candidate.partyId,
    party_name: s.candidate.party.name,
    party_color: s.candidate.party.color,
    start_at: s.startAt, // JSON.stringify で ISO 文字列になる．
    location_name: s.locationName,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    source_url: s.sourceUrl,
    speakers: s.speakers,
    created_at: s.createdAt,
  };
}

export async function getSpeeches(params: SpeechParams = {}) {
  // biome-ignore lint/suspicious/noExplicitAny: 動的クエリのため any を許容する．
  const where: any = {};

  if (params.party_ids?.length) {
    where.candidate = { partyId: { in: params.party_ids } };
  }

  if (params.candidate_ids?.length) {
    where.candidateId = { in: params.candidate_ids };
  }

  if (params.start_time) {
    where.startAt = { ...where.startAt, gte: new Date(params.start_time) };
  }

  if (params.end_time) {
    where.startAt = { ...where.startAt, lte: new Date(params.end_time) };
  }

  if (params.has_location) {
    where.lat = { not: null };
    where.lng = { not: null };
  }

  const speeches = await prisma.speech.findMany({
    where,
    orderBy: { startAt: "asc" },
    take: params.limit || 100,
    skip: params.offset || 0,
    include: {
      candidate: {
        include: { party: true },
      },
    },
  });

  // Date 型のシリアライズのために JSON を経由させる．
  return JSON.parse(JSON.stringify(speeches.map(formatSpeech)));
}

export async function getSpeechesByTimeRange(params: {
  target_time: string;
  range_hours?: number;
  party_ids?: number[];
  candidate_ids?: number[];
}) {
  const targetTime = new Date(params.target_time);
  const range = params.range_hours || 1;
  const startTime = subHours(targetTime, range);
  const endTime = addHours(targetTime, range);

  // biome-ignore lint/suspicious/noExplicitAny: 動的クエリのため any を許容する．
  const where: any = {
    startAt: {
      gte: startTime,
      lte: endTime,
    },
    lat: { not: null },
    lng: { not: null },
  };

  if (params.party_ids?.length) {
    where.candidate = {
      ...where.candidate,
      partyId: { in: params.party_ids },
    };
  }

  if (params.candidate_ids?.length) {
    where.candidateId = { in: params.candidate_ids };
  }

  const speeches = await prisma.speech.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: {
      candidate: {
        include: { party: true },
      },
    },
  });

  return JSON.parse(JSON.stringify(speeches.map(formatSpeech)));
}

export async function getUnknownLocations(limit = 100) {
  const speeches = await prisma.speech.findMany({
    where: {
      OR: [{ lat: null }, { lng: null }],
    },
    orderBy: { startAt: "desc" },
    take: limit,
    include: {
      candidate: {
        include: { party: true },
      },
    },
  });

  return JSON.parse(JSON.stringify(speeches.map(formatSpeech)));
}

export async function getSpeech(id: number) {
  const speech = await prisma.speech.findUnique({
    where: { id },
    include: {
      candidate: {
        include: { party: true },
      },
    },
  });
  return speech ? JSON.parse(JSON.stringify(formatSpeech(speech))) : null;
}

export async function getStats() {
  const [
    totalSpeeches,
    totalCandidates,
    totalParties,
    speechesWithoutLocation,
    lastSpeech,
  ] = await Promise.all([
    prisma.speech.count(),
    prisma.candidate.count(),
    prisma.party.count(),
    prisma.speech.count({
      where: {
        OR: [{ lat: null }, { lng: null }],
      },
    }),
    prisma.speech.findFirst({
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return JSON.parse(
    JSON.stringify({
      total_speeches: totalSpeeches,
      total_candidates: totalCandidates,
      total_parties: totalParties,
      speeches_without_location: speechesWithoutLocation,
      last_updated: lastSpeech?.updatedAt || new Date(),
    }),
  );
}
