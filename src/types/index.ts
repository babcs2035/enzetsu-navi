/**
 * 型定義
 */

// 政党
export interface Party {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

// 候補者
export interface Candidate {
  id: number;
  name: string;
  party_id: number;
  party_name: string;
  party_color: string;
  created_at: string;
  updated_at: string;
}

// 演説データ
export interface Speech {
  id: number;
  start_at: string;
  location_name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  source_url: string | null;
  candidate_id: number;
  candidate_name: string;
  party_id: number;
  party_name: string;
  party_color: string;
  speakers: string[];
  created_at: string;
  updated_at: string;
}

// 統計情報
export interface Stats {
  total_speeches: number;
  total_candidates: number;
  total_parties: number;
  speeches_with_location: number;
  speeches_without_location: number;
  last_updated: string | null;
}

// フィルターモード
export type DateMode = "today" | "upcoming" | "all";

// フィルター状態
export interface FilterState {
  dateMode: DateMode;
  selectedPartyIds: number[];
  selectedCandidateIds: number[];
  showWithLocationOnly: boolean;
}

// API レスポンス
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}
