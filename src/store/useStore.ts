/**
 * Zustand ストア - アプリケーション状態管理
 */

import { create } from 'zustand'
import { partiesApi, speechesApi } from '@/lib/api'
import type { FilterState, Party, Speech, Stats } from '@/types'

interface StoreState {
  // データ
  parties: Party[]
  speeches: Speech[]
  stats: Stats | null

  // UI状態
  activeSpeechId: number | null
  selectedTime: Date
  isLoading: boolean
  error: string | null

  // フィルター
  filter: FilterState

  // ヘルパー
  getPartyColor: (partyId: number) => string
  getPartyById: (partyId: number) => Party | undefined

  // アクション
  setActiveSpeechId: (id: number | null) => void
  setSelectedTime: (time: Date) => void
  setFilter: (filter: Partial<FilterState>) => void
  resetFilter: () => void

  // データ取得
  fetchParties: () => Promise<void>
  fetchSpeeches: () => Promise<void>
  fetchSpeechesByTime: (targetTime: Date) => Promise<void>
  fetchStats: () => Promise<void>
}

const defaultFilter: FilterState = {
  selectedPartyIds: [],
  selectedCandidateIds: [],
  showWithLocationOnly: true,
}

const DEFAULT_COLOR = '#808080'

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
    const party = get().parties.find((p) => p.id === partyId)
    return party?.color || DEFAULT_COLOR
  },

  // ヘルパー関数 - 政党IDから政党を取得
  getPartyById: (partyId: number) => {
    return get().parties.find((p) => p.id === partyId)
  },

  // UI アクション
  setActiveSpeechId: (id) => set({ activeSpeechId: id }),

  setSelectedTime: (time) => {
    set({ selectedTime: time })
    get().fetchSpeechesByTime(time)
  },

  setFilter: (newFilter) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
    }))
    get().fetchSpeechesByTime(get().selectedTime)
  },

  resetFilter: () => {
    set({ filter: defaultFilter })
    get().fetchSpeechesByTime(get().selectedTime)
  },

  // データ取得アクション
  fetchParties: async () => {
    try {
      const parties = await partiesApi.getAll()
      set({ parties })
    } catch (error) {
      console.error('Failed to fetch parties:', error)
      set({ error: '政党データの取得に失敗しました' })
    }
  },

  fetchSpeeches: async () => {
    set({ isLoading: true, error: null })
    try {
      const { filter } = get()
      const speeches = await speechesApi.getAll({
        party_ids: filter.selectedPartyIds.length > 0 ? filter.selectedPartyIds : undefined,
        candidate_ids:
          filter.selectedCandidateIds.length > 0 ? filter.selectedCandidateIds : undefined,
        has_location: filter.showWithLocationOnly ? true : undefined,
        limit: 1000,
      })
      set({ speeches, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch speeches:', error)
      set({ error: '演説データの取得に失敗しました', isLoading: false })
    }
  },

  fetchSpeechesByTime: async (targetTime: Date) => {
    set({ isLoading: true, error: null })
    try {
      const { filter } = get()
      const speeches = await speechesApi.getByTimeRange({
        target_time: targetTime.toISOString(),
        range_hours: 1,
        party_ids: filter.selectedPartyIds.length > 0 ? filter.selectedPartyIds : undefined,
        candidate_ids:
          filter.selectedCandidateIds.length > 0 ? filter.selectedCandidateIds : undefined,
      })
      set({ speeches, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch speeches by time:', error)
      set({ error: '演説データの取得に失敗しました', isLoading: false })
    }
  },

  fetchStats: async () => {
    try {
      const stats = await speechesApi.getStats()
      set({ stats })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  },
}))
