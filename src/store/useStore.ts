/**
 * Zustand を用いたアプリケーションの状態管理を行うストアの実装．
 */

import { create } from "zustand";
import { partiesApi, speechesApi } from "@/lib/api";
import type { FilterState, Party, Speech, Stats } from "@/types";

interface StoreState {
  // データ
  parties: Party[];
  // 内部データ
  // 内部データ
  rawSpeeches: Speech[];
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
  searchQuery: "",
};

const DEFAULT_COLOR = "#808080";

// フィルタリングロジック（再利用可能にするため外に出すか、ストア内で関数化する）
const applyFilter = (rawSpeeches: Speech[], filter: FilterState): Speech[] => {
  return rawSpeeches.filter(speech => {
    // 座標チェック (常に座標ありのみを表示する方針であれば)
    // if (!speech.lat || !speech.lng) return false;

    // 政党フィルター
    if (
      filter.selectedPartyIds.length > 0 &&
      !filter.selectedPartyIds.includes(speech.party_id)
    ) {
      return false;
    }

    // 候補者フィルター (将来用)
    if (
      filter.selectedCandidateIds.length > 0 &&
      !filter.selectedCandidateIds.includes(speech.candidate_id)
    ) {
      return false;
    }

    // 候補者・弁士検索
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      // 候補者名 または 弁士名配列のいずれかが一致するか
      // ユーザー体験のため、スペース区切りでの複数キーワード（AND検索）などにはせず、単純な部分一致とする
      // ただし、Autocompleteで選択された場合は完全一致に近いものが来る想定
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

export const useStore = create<StoreState>((set, get) => ({
  // 初期状態の設定を行う．
  parties: [],
  speeches: [],
  rawSpeeches: [], // 追加
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

  // UI アクション: フィルターを更新し，データを再計算する．
  setFilter: newFilter => {
    const currentFilter = get().filter;
    const updatedFilter = { ...currentFilter, ...newFilter };

    // 日付モード または 検索クエリ が変わった場合はデータを再取得する
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

    // クライアントサイドフィルタリングのみの場合
    const { rawSpeeches } = get();
    const filtered = applyFilter(rawSpeeches, updatedFilter);

    set({
      filter: updatedFilter,
      speeches: filtered,
      activeSpeechId: null,
    });
  },

  // UI アクション: フィルターをリセットし，初期状態（日付以外）に戻す．
  resetFilter: () => {
    const currentFilter = get().filter;
    // dateMode は維持する
    const resetFilterState: FilterState = {
      ...defaultFilter,
      dateMode: currentFilter.dateMode,
    };

    const { rawSpeeches } = get();
    const filtered = applyFilter(rawSpeeches, resetFilterState);

    set({
      filter: resetFilterState,
      speeches: filtered,
      activeSpeechId: null,
    });
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

  // 互換性のための残置メソッド
  fetchSpeeches: async () => {
    get().fetchSpeechesByTime(get().selectedTime);
  },

  // データ取得アクション: 現在の時間に基づいて演説データを取得する（フィルタリングはクライアントサイドで行う）．
  fetchSpeechesByTime: async (targetTime: Date) => {
    set({ isLoading: true, error: null });
    try {
      const { filter } = get();
      let rawSpeeches: Speech[] = [];

      // API 呼び出し時にフィルター条件 (party_ids, candidate_ids) を渡さないように変更
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
        // 今日・明日
        // 検索時は移動経路を表示したいので、その日のデータを広く取得する (24時間)
        // 通常時はパフォーマンス重視で前後1時間
        const rangeHours = filter.searchQuery ? 24 : 1;
        rawSpeeches = await speechesApi.getByTimeRange({
          target_time: targetTime.toISOString(),
          range_hours: rangeHours,
        });
      }

      // クライアントサイドフィルタリング適用
      const filtered = applyFilter(rawSpeeches, filter);

      set({ rawSpeeches, speeches: filtered, isLoading: false });
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
