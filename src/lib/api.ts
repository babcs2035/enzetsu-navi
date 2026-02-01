/**
 * アプリケーションフロントエンドから利用する API クライアントの実装．
 * 内部的には Server Actions を呼び出すことで， Next.js の RPC 機構を介して
 * 安全かつ効率的にサーバーサイドの機能を利用する．
 */

import { scrapeAll, scrapeParty } from "@/actions/admin";
import { getCandidate, getCandidates } from "@/actions/candidates";
import { getParties, getParty } from "@/actions/parties";
import {
  getSearchSuggestions,
  getSpeech,
  getSpeeches,
  getSpeechesByTimeRange,
  getStats,
  getUnknownLocations,
} from "@/actions/speeches";

/**
 * 政党情報に関連する API 群．
 */
export const partiesApi = {
  /** 全政党を取得する． */
  getAll: () => getParties(),
  /** 指定 ID の政党情報を取得する． */
  getById: (id: number) => getParty(id),
};

/**
 * 候補者に関連する API 群．
 */
export const candidatesApi = {
  /** 全候補者（または特定政党の候補者）を取得する． */
  getAll: (partyId?: number) => getCandidates(partyId),
  /** 指定 ID の候補者情報を取得する． */
  getById: (id: number) => getCandidate(id),
};

/**
 * 演説スケジュールに関連する API 群．
 */
export const speechesApi = {
  /** 指定された条件に基づき演説リストを取得する． */
  getAll: (params?: {
    start_time?: string;
    end_time?: string;
    party_ids?: number[];
    candidate_ids?: number[];
    has_location?: boolean;
    limit?: number;
    offset?: number;
  }) => getSpeeches(params),

  /** 指定された時刻の前後一定範囲の演説を取得する． */
  getByTimeRange: (params: {
    target_time: string;
    range_hours?: number;
    party_ids?: number[];
    candidate_ids?: number[];
  }) => getSpeechesByTimeRange(params),

  /** 位置情報が未特定の演説を取得する． */
  getUnknownLocations: (limit?: number) => getUnknownLocations(limit),

  /** 演説データに関する統計情報を取得する． */
  getStats: () => getStats(),

  /** 指定 ID の演説詳細を取得する． */
  getById: (id: number) => getSpeech(id),

  /** 検索サジェスト用の候補リストを取得する． */
  getSearchSuggestions: () => getSearchSuggestions(),
};

/**
 * スクレイピング実行などの管理用 API 群．
 */
export const adminApi = {
  /** 全政党のスクレイピングを並列実行する． */
  triggerScrape: () => scrapeAll(),
  /** 特定の政党のみスクレイピングを実行する． */
  triggerPartyScrape: (partyName: string) => scrapeParty(partyName),
};
