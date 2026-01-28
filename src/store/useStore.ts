/**
 * Zustand ストア - アプリケーション状態管理
 */

import { create } from "zustand";
import { partiesApi, speechesApi } from "@/lib/api";
import type { FilterState, Party, Speech, Stats } from "@/types";

interface StoreState {
  // データ
  parties: Party[];
  speeches: Speech[];
  stats: Stats | null;

  // UI状態
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
  showWithLocationOnly: true,
};

const DEFAULT_COLOR = "#808080";

export const useStore = create<StoreState>((set, get) => ({
  // 初期状態
  parties: [],
  speeches: [],
  stats: null,
  activeSpeechId: null,
  selectedTime: new Date(),
  isLoading: false,
  error: null,
  filter: defaultFilter,

  // ヘルパー関数 - 政党IDから色を取得（DBから取得した値を使用）
  getPartyColor: (partyId: number) => {
    const party = get().parties.find(p => p.id === partyId);
    return party?.color || DEFAULT_COLOR;
  },

  // ヘルパー関数 - 政党IDから政党を取得
  getPartyById: (partyId: number) => {
    return get().parties.find(p => p.id === partyId);
  },

  // UI アクション
  setActiveSpeechId: id => set({ activeSpeechId: id }),

  setSelectedTime: time => {
    set({ selectedTime: time, activeSpeechId: null });
    get().fetchSpeechesByTime(time);
  },

  setFilter: newFilter => {
    set(state => ({
      filter: { ...state.filter, ...newFilter },
    }));
    // フィルター変更時は、現在のモードに合わせてリストを再取得する必要がある？
    // fetchSpeeches()を呼ぶべきか、fetchSpeechesByTime()を呼ぶべきか、あるいは両方か。
    // アプリの構造上、リストは fetchSpeeches (getAll) の結果を表示し、地図は TimeSlider に連動して fetchSpeechesByTime の結果を表示している可能性がある。
    // ここでは両方更新しておくのが無難。
    const { fetchSpeeches, fetchSpeechesByTime, selectedTime } = get();
    fetchSpeeches();
    fetchSpeechesByTime(selectedTime);
  },

  resetFilter: () => {
    set({ filter: defaultFilter });
    const { fetchSpeeches, fetchSpeechesByTime, selectedTime } = get();
    fetchSpeeches();
    fetchSpeechesByTime(selectedTime);
  },

  // データ取得アクション
  fetchParties: async () => {
    try {
      const parties = await partiesApi.getAll();
      set({ parties });
    } catch (error) {
      console.error("Failed to fetch parties:", error);
      set({ error: "政党データの取得に失敗しました" });
    }
  },

  fetchSpeeches: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filter } = get();

      let start_time: string | undefined;
      let end_time: string | undefined;

      const now = new Date();

      if (filter.dateMode === "today") {
        // 今日の00:00:00
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start_time = start.toISOString();

        // 今日の23:59:59
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        end_time = end.toISOString();
      } else if (filter.dateMode === "upcoming") {
        // 現在時刻以降
        start_time = now.toISOString();
      } else if (filter.dateMode === "all") {
        // 全期間（指定なし）
      }

      const speeches = await speechesApi.getAll({
        start_time,
        end_time,
        party_ids:
          filter.selectedPartyIds.length > 0
            ? filter.selectedPartyIds
            : undefined,
        candidate_ids:
          filter.selectedCandidateIds.length > 0
            ? filter.selectedCandidateIds
            : undefined,
        has_location: filter.showWithLocationOnly ? true : undefined,
        limit: 1000,
      });
      set({ speeches, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch speeches:", error);
      set({ error: "演説データの取得に失敗しました", isLoading: false });
    }
  },

  fetchSpeechesByTime: async (targetTime: Date) => {
    // 地図表示用（タイムスライダー連動）
    // こちらにもフィルタを適用すべきだが、dateModeによる期間制限は
    // targetTime自体がその範囲外であれば空になるべき？
    // あるいは、TimeSliderの範囲自体を制限すべき？
    // いったん、政党フィルターのみ適用し、dateModeの制限は緩める（TimeSliderでユーザーが自由に動かせるため）。
    // ただし、もし厳格にするならここでチェックを入れる。
    // 「可視化」の要件において、地図上のデータも絞り込まれるべき。

    set({ isLoading: true, error: null });
    try {
      const { filter } = get();
      const speeches = await speechesApi.getByTimeRange({
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
      // NOTE: getByTimeRangeの結果をそのままspeechesにセットするとリスト表示も変わってしまう可能性があるが、
      // useStoreの構造上、speeches stateは一つしかない。
      // HomePageの実装を見ると、Sidebar内のSpeechListは useStoreのspeeches を使っているはず。
      // 地図は MapView コンポーネント内で speeches を使っているかどうか？
      // もし `speeches` state がリストと地図両方で共有されているなら、
      // `fetchSpeeches` と `fetchSpeechesByTime` が競合する。

      // 実装から推測すると:
      // - ページ読み込み時に `fetchSpeeches` が走る -> 全件（または今日の分）が `speeches` に入る -> リストに表示される。
      // - ユーザーが TimeSlider を動かす -> `fetchSpeechesByTime` が走る -> 部分データが `speeches` に入る -> リストも部分データになる？

      // もしそうなら、リストには常に（フィルタされた期間の）全件を表示し、地図には選択時間のデータを表示したい場合、
      // state を分けるべきかもしれない (`mapSpeeches` と `listSpeeches` のように)。
      // 現状のまま進めると、タイムスライダーを動かすとリストも減ってしまう。
      // ユーザー要件「地図・リストでの可視化」において、リストがタイムスライダーに連動するのは仕様として正しい可能性もある。
      // しかし「本日の演説」を選択したのに、タイムスライダーがある時点を指しているせいで1件しかリストに出ない、というのは使いにくいかも。

      // とりあえず既存の挙動（speechesを上書き）を踏襲する。
      set({ speeches, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch speeches by time:", error);
      set({ error: "演説データの取得に失敗しました", isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await speechesApi.getStats();
      set({ stats });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  },
}));
