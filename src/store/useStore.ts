/**
 * Zustand を用いたアプリケーションの状態管理を行うストアの実装．
 */

import { differenceInMinutes, isAfter } from "date-fns";
import { create } from "zustand";
import { partiesApi, speechesApi } from "@/lib/api";
import type { FilterState, Party, Speech, Stats } from "@/types";

/**
 * ストアの状態定義．
 */
interface StoreState {
  // エンティティデータ
  parties: Party[];
  rawSpeeches: Speech[];
  speeches: Speech[];
  stats: Stats | null;

  // UI 関連の状態
  activeSpeechId: number | null;
  selectedTime: Date;
  isLoading: boolean;
  error: string | null;

  // フィルターの設定状態
  filter: FilterState;

  // ヘルパーメソッド
  getPartyColor: (partyId: number) => string;
  getPartyById: (partyId: number) => Party | undefined;

  // 状態更新アクション
  setActiveSpeechId: (id: number | null) => void;
  setSelectedTime: (time: Date) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  resetFilter: () => void;

  // データ取得アクション
  fetchParties: () => Promise<void>;
  fetchSpeechesByTime: (targetTime: Date) => Promise<void>;
  fetchStats: () => Promise<void>;
}

/**
 * フィルターの初期状態．
 */
const defaultFilter: FilterState = {
  dateMode: "today",
  selectedPartyIds: [],
  selectedCandidateIds: [],
  searchQuery: "",
};

const DEFAULT_COLOR = "#808080";

/**
 * 演説データに対してフィルタリングを適用する内部関数．
 *
 * @param rawSpeeches 元の演説データ配列
 * @param filter 現在のフィルター設定
 * @param selectedTime 選択されている時刻
 * @returns フィルタリング後の演説データ配列
 */
const applyFilter = (
  rawSpeeches: Speech[],
  filter: FilterState,
  selectedTime: Date,
): Speech[] => {
  return rawSpeeches.filter(speech => {
    const speechDate = new Date(speech.start_at);

    // 日付モードに基づくフィルタリング
    if (filter.dateMode === "today") {
      // 選択時刻の前後 60 分以内の演説のみを表示する
      const diff = Math.abs(differenceInMinutes(speechDate, selectedTime));
      if (diff > 60) return false;
    } else if (filter.dateMode === "upcoming") {
      // 現在時刻より後の演説のみを表示する
      if (!isAfter(speechDate, new Date())) return false;
    }

    // 政党によるフィルタリング
    if (
      filter.selectedPartyIds.length > 0 &&
      !filter.selectedPartyIds.includes(speech.party_id)
    ) {
      return false;
    }

    // 候補者 ID によるフィルタリング（将来用）
    if (
      filter.selectedCandidateIds.length > 0 &&
      !filter.selectedCandidateIds.includes(speech.candidate_id)
    ) {
      return false;
    }

    // 検索クエリ（候補者名・弁士名）によるフィルタリング
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      const matchCandidate = speech.candidate_name
        .toLowerCase()
        .includes(query);
      const matchSpeaker = speech.speakers.some(s =>
        s.toLowerCase().includes(query),
      );

      if (!matchCandidate && !matchSpeaker) {
        return false;
      }
    }

    return true;
  });
};

/**
 * アプリケーションのグローバルストアを作成する．
 */
export const useStore = create<StoreState>((set, get) => ({
  // 初期状態
  parties: [],
  speeches: [],
  rawSpeeches: [],
  stats: null,
  activeSpeechId: null,
  selectedTime: new Date(),
  isLoading: false,
  error: null,
  filter: defaultFilter,

  // 政党 ID から対応する色（16 進数）を取得する
  getPartyColor: (partyId: number) => {
    const party = get().parties.find(p => p.id === partyId);
    return party?.color || DEFAULT_COLOR;
  },

  // 政党 ID から政党情報を取得する
  getPartyById: (partyId: number) => {
    return get().parties.find(p => p.id === partyId);
  },

  // 選択中の演説 ID を更新する
  setActiveSpeechId: id => set({ activeSpeechId: id }),

  // 選択時刻を更新し，関連するデータを再取得する
  setSelectedTime: time => {
    set({ selectedTime: time, activeSpeechId: null });
    get().fetchSpeechesByTime(time);
  },

  // フィルター条件を更新し，必要に応じてデータを再取得または再計算する
  setFilter: newFilter => {
    const currentFilter = get().filter;
    const updatedFilter = { ...currentFilter, ...newFilter };

    // データの再取得が必要な条件（日付モードまたは検索クエリの変更）かを確認する
    if (
      (newFilter.dateMode && newFilter.dateMode !== currentFilter.dateMode) ||
      (newFilter.searchQuery !== undefined &&
        newFilter.searchQuery !== currentFilter.searchQuery)
    ) {
      set({ filter: updatedFilter, activeSpeechId: null });
      const { fetchSpeechesByTime, selectedTime } = get();
      fetchSpeechesByTime(selectedTime);
      return;
    }

    // クライアントサイドでのフィルタリングを適用する
    const { rawSpeeches, selectedTime } = get();
    const filtered = applyFilter(rawSpeeches, updatedFilter, selectedTime);

    set({
      filter: updatedFilter,
      speeches: filtered,
      activeSpeechId: null,
    });
  },

  // フィルターを初期状態にリセットする（日付モードは維持）
  resetFilter: () => {
    const currentFilter = get().filter;
    const { rawSpeeches, selectedTime } = get();

    const resetFilterState: FilterState = {
      ...defaultFilter,
      dateMode: currentFilter.dateMode,
    };

    const filtered = applyFilter(rawSpeeches, resetFilterState, selectedTime);

    set({
      filter: resetFilterState,
      speeches: filtered,
      activeSpeechId: null,
    });
  },

  // 全政党の情報を取得する
  fetchParties: async () => {
    try {
      const parties = await partiesApi.getAll();
      set({ parties });
    } catch (error) {
      console.error("❌ Failed to fetch parties:", error);
      set({ error: "Failed to fetch party data." });
    }
  },

  // 指定された時刻に基づいて演説データを取得・更新する
  fetchSpeechesByTime: async (targetTime: Date) => {
    set({ isLoading: true, error: null });
    try {
      const { filter } = get();
      let rawSpeeches: Speech[] = [];

      // モードに応じたデータ取得
      if (filter.dateMode === "all") {
        rawSpeeches = await speechesApi.getAll({
          has_location: true,
          limit: 1000,
        });
      } else if (filter.dateMode === "upcoming") {
        rawSpeeches = await speechesApi.getAll({
          start_time: new Date().toISOString(),
          has_location: true,
          limit: 1000,
        });
      } else {
        // デフォルトは前後 1 時間の範囲を取得する
        rawSpeeches = await speechesApi.getByTimeRange({
          target_time: targetTime.toISOString(),
          range_hours: 1,
        });
      }

      const filtered = applyFilter(rawSpeeches, filter, targetTime);
      set({ rawSpeeches, speeches: filtered, isLoading: false });
    } catch (error) {
      console.error("❌ Failed to fetch speeches:", error);
      set({ error: "Failed to fetch speech data.", isLoading: false });
    }
  },

  // 統計情報を取得する
  fetchStats: async () => {
    try {
      const stats = await speechesApi.getStats();
      set({ stats });
    } catch (error) {
      console.error("❌ Failed to fetch stats:", error);
    }
  },
}));
