"use server";

import { addHours, subHours } from "date-fns";
import { prisma } from "@/lib/prisma";

/**
 * 演説データの取得に使用するパラメータ定義．
 */
interface SpeechParams {
  start_time?: string;
  end_time?: string;
  party_ids?: number[];
  candidate_ids?: number[];
  has_location?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Prisma から取得した生の演説データを，アプリケーションで扱いやすい形式に整形する．
 *
 * @param s Prisma の Speech モデル（関連付けを含む）
 * @returns 整形済みの演説オブジェクト
 */
// biome-ignore lint/suspicious/noExplicitAny: Prisma の型推論が複雑なため any を許容する．
function formatSpeech(s: any) {
  return {
    id: s.id,
    candidate_id: s.candidateId,
    candidate_name: s.candidate.name,
    party_id: s.candidate.partyId,
    party_name: s.candidate.party.name,
    party_color: s.candidate.party.color,
    start_at: s.startAt,
    location_name: s.locationName,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    source_url: s.sourceUrl,
    speakers: s.speakers,
    created_at: s.createdAt,
  };
}

/**
 * 条件に一致する演説データを取得する．
 *
 * @param params 絞り込みパラメータ
 * @returns 整形済みの演説データ配列
 */
export async function getSpeeches(params: SpeechParams = {}) {
  // biome-ignore lint/suspicious/noExplicitAny: 動的クエリ構築のため any を許容する．
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

  // Date 型のシリアライズ（Next.js Server Actions の制約）のために JSON 変換を行う．
  return JSON.parse(JSON.stringify(speeches.map(formatSpeech)));
}

/**
 * 指定された時刻の前後一定範囲に開催される演説データを取得する．
 *
 * @param params 検索基準時刻，範囲（時間），フィルタリング条件
 * @returns 整形済みの演説データ配列
 */
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

  // biome-ignore lint/suspicious/noExplicitAny: 動的クエリ構築のため any を許容する．
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

/**
 * 位置情報が未特定の演説データを取得する．
 *
 * @param limit 取得件数制限
 * @returns 整形済みの演説データ配列
 */
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

/**
 * 指定された ID の演説データを 1 件取得する．
 *
 * @param id 演説 ID
 * @returns 整形済みの演説データ，または存在しない場合は null
 */
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

/**
 * 演説データに関する統計情報を取得する．
 *
 * @returns 統計情報オブジェクト（総演説数，総候補者数，総政党数，位置未特定数，最終更新日時）
 */
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

/**
 * 検索サジェスト用の候補者名および弁士名のユニークなリストを取得する．
 * フィルター状態に関わらず全件から抽出する．
 *
 * @returns 候補者・弁士名の配列（{ name: string, type: 'candidate' | 'speaker' }[]）
 */
export async function getSearchSuggestions() {
  const speeches = await prisma.speech.findMany({
    select: {
      speakers: true,
      candidate: {
        select: {
          name: true,
          party: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
  });

  // 候補者のマッピング（名前 -> 政党情報）
  const candidateParties = new Map<
    string,
    { id: number; name: string; color: string }
  >();
  // 弁士のマッピング（名前 -> 政党情報）。弁士の場合は複数の政党で話す可能性があるが、今回は最初に見つかったものを採用する。
  const speakerParties = new Map<
    string,
    { id: number; name: string; color: string }
  >();

  const candidates = new Set<string>();
  const speakers = new Set<string>();

  for (const s of speeches) {
    if (s.candidate?.name) {
      candidates.add(s.candidate.name);
      if (s.candidate.party && !candidateParties.has(s.candidate.name)) {
        candidateParties.set(s.candidate.name, {
          id: s.candidate.party.id,
          name: s.candidate.party.name,
          color: s.candidate.party.color,
        });
      }
    }
    if (s.speakers && Array.isArray(s.speakers)) {
      for (const speaker of s.speakers) {
        if (typeof speaker === "string" && speaker.trim()) {
          const cleanSpeaker = speaker.trim();
          speakers.add(cleanSpeaker);
          // 弁士の政党情報を記録（まだ記録されていない場合のみ）
          if (s.candidate?.party && !speakerParties.has(cleanSpeaker)) {
            speakerParties.set(cleanSpeaker, {
              id: s.candidate.party.id,
              name: s.candidate.party.name,
              color: s.candidate.party.color,
            });
          }
        }
      }
    }
  }

  const result: {
    name: string;
    type: "candidate" | "speaker";
    party?: { id: number; name: string; color: string };
  }[] = [];

  for (const name of candidates) {
    result.push({
      name,
      type: "candidate",
      party: candidateParties.get(name),
    });
  }

  for (const name of speakers) {
    // 候補者としても存在する場合は候補者優先
    if (!candidates.has(name)) {
      result.push({
        name,
        type: "speaker",
        party: speakerParties.get(name),
      });
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}
