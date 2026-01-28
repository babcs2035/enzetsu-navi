/**
 * Zustand を用いたアプリケーションの状態管理を行うストアの実装．
 */

import { create } from "zustand";
import { partiesApi, speechesApi } from "@/lib/api";
import type { FilterState, Party, Speech, Stats } from "@/types";

interface StoreState {
  // データ
  parties: Party[];
  speeches: Speech[];
  stats: Stats | null;

  // UI 状態
  activeSpeechId: number | null;
  selectedTime: Date;
  isLoading: boolean;
  error: string | null;

  // フィルター
  filter: FilterState;

  // ヘルパー
  getPartyColor: (partyId: number) => string;
  getPartyById: (partyId: number) => Party | undefined;

  // アクション
  setActiveSpeechId: (id: number | null) => void;
  setSelectedTime: (time: Date) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  resetFilter: () => void;

  // データ取得
  fetchParties: () => Promise<void>;
  fetchSpeeches: () => Promise<void>;
  fetchSpeechesByTime: (targetTime: Date) => Promise<void>;
  fetchStats: () => Promise<void>;
}

const defaultFilter: FilterState = {
  dateMode: "today",
  selectedPartyIds: [],
  selectedCandidateIds: [],
};

const DEFAULT_COLOR = "#808080";

export const useStore = create<StoreState>((set, get) => ({
  // 初期状態の設定を行う．
  parties: [],
  speeches: [],
  stats: null,
  activeSpeechId: null,
  selectedTime: new Date(),
  isLoading: false,
  error: null,
  filter: defaultFilter,

  // ヘルパー関数: 政党 ID から色を取得する（DB から取得した値を使用する）．
  getPartyColor: (partyId: number) => {
    const party = get().parties.find(p => p.id === partyId);
    return party?.color || DEFAULT_COLOR;
  },

  // ヘルパー関数: 政党 ID から政党を取得する．
  getPartyById: (partyId: number) => {
    return get().parties.find(p => p.id === partyId);
  },

  // UI アクション: 選択中の演説 ID を設定する．
  setActiveSpeechId: id => set({ activeSpeechId: id }),

  // UI アクション: 選択時間を設定し，データを取得する．
  setSelectedTime: time => {
    set({ selectedTime: time, activeSpeechId: null });
    get().fetchSpeechesByTime(time);
  },

  // UI アクション: フィルターを更新し，データを再取得する．
  setFilter: newFilter => {
    set(state => ({
      filter: { ...state.filter, ...newFilter },
      activeSpeechId: null, // フィルター変更時に選択を解除する．
    }));
    // フィルター変更時は，リストと地図両方のデータを更新する．
    const { fetchSpeechesByTime, selectedTime } = get();
    fetchSpeechesByTime(selectedTime);
  },

  // UI アクション: フィルターをリセットし，初期状態に戻す．
  resetFilter: () => {
    set({ filter: defaultFilter, activeSpeechId: null });
    const { fetchSpeechesByTime, selectedTime } = get();
    fetchSpeechesByTime(selectedTime);
  },

  // データ取得アクション: 政党一覧を取得する．
  fetchParties: async () => {
    try {
      const parties = await partiesApi.getAll();
      set({ parties });
    } catch (error) {
      console.error("❌ Failed to fetch parties:", error);
      set({ error: "政党データの取得に失敗しました" });
    }
  },

  // 互換性のための残置メソッド（実質的な処理は fetchSpeechesByTime に統合済み）．
  fetchSpeeches: async () => {
    get().fetchSpeechesByTime(get().selectedTime);
  },

  // データ取得アクション: 現在のフィルターと時間に基づいて演説データを取得する．
  fetchSpeechesByTime: async (targetTime: Date) => {
    set({ isLoading: true, error: null });
    try {
      const { filter } = get();
      let speeches: Speech[] = [];

      if (filter.dateMode === "all") {
        // 全期間表示（タイムスライダーの設定を無視する）．
        speeches = await speechesApi.getAll({
          party_ids:
            filter.selectedPartyIds.length > 0
              ? filter.selectedPartyIds
              : undefined,
          candidate_ids:
            filter.selectedCandidateIds.length > 0
              ? filter.selectedCandidateIds
              : undefined,
          has_location: true, // 常に座標ありのみを表示する．
          limit: 1000,
        });
      } else if (filter.dateMode === "upcoming") {
        // これから（現在時刻以降を表示し，タイムスライダーの設定を無視する）．
        speeches = await speechesApi.getAll({
          start_time: new Date().toISOString(),
          party_ids:
            filter.selectedPartyIds.length > 0
              ? filter.selectedPartyIds
              : undefined,
          candidate_ids:
            filter.selectedCandidateIds.length > 0
              ? filter.selectedCandidateIds
              : undefined,
          has_location: true, // 常に座標ありのみを表示する．
          limit: 1000,
        });
      } else {
        // 今日・明日（タイムスライダーの設定を反映する）．
        // getByTimeRange はサーバー側で has_location チェックを行っているため自動的に絞り込まれる．
        speeches = await speechesApi.getByTimeRange({
          target_time: targetTime.toISOString(),
          range_hours: 1,
          party_ids:
            filter.selectedPartyIds.length > 0
              ? filter.selectedPartyIds
              : undefined,
          candidate_ids:
            filter.selectedCandidateIds.length > 0
              ? filter.selectedCandidateIds
              : undefined,
        });
      }

      set({ speeches, isLoading: false });
    } catch (error) {
      console.error("❌ Failed to fetch speeches:", error);
      set({ error: "演説データの取得に失敗しました", isLoading: false });
    }
  },

  // データ取得アクション: 統計情報を取得する．
  fetchStats: async () => {
    try {
      const stats = await speechesApi.getStats();
      set({ stats });
    } catch (error) {
      console.error("❌ Failed to fetch stats:", error);
    }
  },
}));
