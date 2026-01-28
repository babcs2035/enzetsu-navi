/**
 * アプリケーション全体で使用する型定義を提供する．
 */

// 政党に関する型定義．
export interface Party {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

// 候補者に関する型定義．
export interface Candidate {
  id: number;
  name: string;
  party_id: number;
  party_name: string;
  party_color: string;
  created_at: string;
  updated_at: string;
}

// 演説データに関する型定義．
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

// 統計情報に関する型定義．
export interface Stats {
  total_speeches: number;
  total_candidates: number;
  total_parties: number;
  speeches_with_location: number;
  speeches_without_location: number;
  last_updated: string | null;
}

// フィルターの日付モードに関する型定義．
export type DateMode = "today" | "upcoming" | "all";

// フィルターのステータスに関する型定義．
export interface FilterState {
  dateMode: DateMode;
  selectedPartyIds: number[];
  selectedCandidateIds: number[];
}

// API レスポンスに関する型定義．
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}
