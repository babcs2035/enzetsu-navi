/**
 * Zustand を用いたアプリケーションの状態管理を行うストアの実装．
 */

import { addDays, differenceInMinutes, endOfDay, startOfDay } from "date-fns";
import { create } from "zustand";
import { partiesApi, speechesApi } from "@/lib/api";
import type {
  FilterState,
  Party,
  SearchSuggestion,
  Speech,
  Stats,
} from "@/types";

/**
 * ストアの状態定義．
 */
interface StoreState {
  // エンティティデータ
  parties: Party[];
  rawSpeeches: Speech[];
  speeches: Speech[];
  searchSuggestions: SearchSuggestion[];
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
  fetchSearchSuggestions: () => Promise<void>;
}

/**
 * フィルターの初期状態．
 */
const defaultFilter: FilterState = {
  dateMode: "today",
  selectedPartyIds: [],
  selectedCandidateIds: [],
  selectedNames: [],
  allDay: false,
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
      if (filter.allDay) {
        // 終日モード: 当日の演説すべてを表示
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        if (speechDate < todayStart || speechDate > todayEnd) return false;
      } else {
        // 選択時刻の前後 60 分以内の演説のみを表示する
        const diff = Math.abs(differenceInMinutes(speechDate, selectedTime));
        if (diff > 60) return false;
      }
    } else if (filter.dateMode === "tomorrow") {
      // 明日の演説のみを表示する
      const now = new Date();
      const tomorrowStart = startOfDay(addDays(now, 1));
      const tomorrowEnd = endOfDay(addDays(now, 1));
      if (speechDate < tomorrowStart || speechDate > tomorrowEnd) return false;
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

    // 選択された名前によるフィルタリング（複数選択対応）
    if (filter.selectedNames.length > 0) {
      // 選択された名前のいずれかに一致するかをチェック
      const matchesAny = filter.selectedNames.some(name => {
        const lowerName = name.toLowerCase();
        const matchCandidate = speech.candidate_name
          .toLowerCase()
          .includes(lowerName);
        const matchSpeaker = speech.speakers.some(s =>
          s.toLowerCase().includes(lowerName),
        );
        return matchCandidate || matchSpeaker;
      });

      if (!matchesAny) {
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
  searchSuggestions: [],
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

    // データの再取得が必要な条件（日付モード、終日モード、または選択名の変更）かを確認する
    if (
      (newFilter.dateMode && newFilter.dateMode !== currentFilter.dateMode) ||
      (newFilter.allDay !== undefined &&
        newFilter.allDay !== currentFilter.allDay) ||
      (newFilter.selectedNames !== undefined &&
        JSON.stringify(newFilter.selectedNames) !==
          JSON.stringify(currentFilter.selectedNames))
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
      } else if (filter.dateMode === "tomorrow") {
        // 明日の演説を取得する
        const now = new Date();
        const tomorrowStart = startOfDay(addDays(now, 1));
        const tomorrowEnd = endOfDay(addDays(now, 1));
        rawSpeeches = await speechesApi.getAll({
          start_time: tomorrowStart.toISOString(),
          end_time: tomorrowEnd.toISOString(),
          has_location: true,
          limit: 1000,
        });
      } else if (filter.allDay) {
        // 終日モード: 当日全体のデータを取得する
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        rawSpeeches = await speechesApi.getAll({
          start_time: todayStart.toISOString(),
          end_time: todayEnd.toISOString(),
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

  // 検索サジェスト用の候補リストを取得する
  fetchSearchSuggestions: async () => {
    try {
      const suggestions = await speechesApi.getSearchSuggestions();
      set({ searchSuggestions: suggestions });
    } catch (error) {
      console.error("❌ Failed to fetch search suggestions:", error);
    }
  },
}));
