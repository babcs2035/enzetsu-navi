/**
 * API クライアント (Server Actions版)
 * 外部APIエンドポイントへのfetchを廃止し、Server Actionsを直接呼び出すことで
 * 通信をNext.js内部のRPCに隠蔽し、セキュリティを向上させる。
 */

import { scrapeAll, scrapeParty } from "@/actions/admin";
import { getCandidate, getCandidates } from "@/actions/candidates";
import { getParties, getParty } from "@/actions/parties";
import {
  getSpeech,
  getSpeeches,
  getSpeechesByTimeRange,
  getStats,
  getUnknownLocations,
} from "@/actions/speeches";

// 政党API
export const partiesApi = {
  getAll: () => getParties(),
  getById: (id: number) => getParty(id),
};

// 候補者API
export const candidatesApi = {
  getAll: (partyId?: number) => getCandidates(partyId),
  getById: (id: number) => getCandidate(id),
};

// 演説API
export const speechesApi = {
  getAll: (params?: {
    start_time?: string;
    end_time?: string;
    party_ids?: number[];
    candidate_ids?: number[];
    has_location?: boolean;
    limit?: number;
    offset?: number;
  }) => getSpeeches(params),

  getByTimeRange: (params: {
    target_time: string;
    range_hours?: number;
    party_ids?: number[];
    candidate_ids?: number[];
  }) => getSpeechesByTimeRange(params),

  getUnknownLocations: (limit?: number) => getUnknownLocations(limit),

  getStats: () => getStats(),

  getById: (id: number) => getSpeech(id),
};

// 管理API
export const adminApi = {
  triggerScrape: () => scrapeAll(),
  triggerPartyScrape: (partyName: string) => scrapeParty(partyName),
};
