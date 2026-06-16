import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  AppState,
  MovementRecord,
  SolutionLibraryItem,
  DEFAULT_MAINSPRING,
  createDefaultSolutions,
  generateId
} from './types'
import {
  MainspringParams,
  TorqueAnalysisResult,
  calculateTorqueCurve
} from '@/utils/mainspringPhysics'

interface AppStore extends AppState {
  setCurrentMainspring: (params: MainspringParams) => void
  setTorqueAnalysis: (analysis: TorqueAnalysisResult | null) => void
  analyzeCurrentMainspring: (temperature?: number) => void
  setCurrentPage: (page: AppState['currentPage']) => void
  setAnalysisTemperature: (temp: number) => void
  addMovementRecord: (record: Omit<MovementRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateMovementRecord: (id: string, updates: Partial<MovementRecord>) => void
  deleteMovementRecord: (id: string) => void
  setSelectedMovementId: (id: string | null) => void
  addSolutionItem: (item: Omit<SolutionLibraryItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateSolutionItem: (id: string, updates: Partial<SolutionLibraryItem>) => void
  deleteSolutionItem: (id: string) => void
  setSelectedSolutionId: (id: string | null) => void
  loadMovementFromArchive: (id: string) => void
  loadSolutionFromLibrary: (id: string) => void
  exportSolutionToJson: (id: string) => Promise<string | null>
  importSolutionFromJson: (data: unknown) => { success: boolean; error?: string }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentMainspring: DEFAULT_MAINSPRING,
      torqueAnalysis: null,
      movementRecords: [],
      solutionLibrary: createDefaultSolutions(),
      selectedMovementId: null,
      selectedSolutionId: null,
      analysisTemperature: 20,
      currentPage: 'input',

      setCurrentMainspring: (params) => {
        set({ currentMainspring: params })
        const { analysisTemperature } = get()
        const analysis = calculateTorqueCurve(params, analysisTemperature)
        set({ torqueAnalysis: analysis })
      },

      setTorqueAnalysis: (analysis) => set({ torqueAnalysis: analysis }),

      analyzeCurrentMainspring: (temperature) => {
        const { currentMainspring } = get()
        const temp = temperature ?? get().analysisTemperature
        if (currentMainspring) {
          const analysis = calculateTorqueCurve(currentMainspring, temp)
          set({ torqueAnalysis: analysis, analysisTemperature: temp })
        }
      },

      setCurrentPage: (page) => set({ currentPage: page }),

      setAnalysisTemperature: (temp) => {
        set({ analysisTemperature: temp })
        const { currentMainspring } = get()
        if (currentMainspring) {
          const analysis = calculateTorqueCurve(currentMainspring, temp)
          set({ torqueAnalysis: analysis })
        }
      },

      addMovementRecord: (record) => {
        const newRecord: MovementRecord = {
          ...record,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        set((state) => ({
          movementRecords: [...state.movementRecords, newRecord]
        }))
      },

      updateMovementRecord: (id, updates) => {
        set((state) => ({
          movementRecords: state.movementRecords.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          )
        }))
      },

      deleteMovementRecord: (id) => {
        set((state) => ({
          movementRecords: state.movementRecords.filter((r) => r.id !== id),
          selectedMovementId: state.selectedMovementId === id ? null : state.selectedMovementId
        }))
      },

      setSelectedMovementId: (id) => set({ selectedMovementId: id }),

      addSolutionItem: (item) => {
        const newItem: SolutionLibraryItem = {
          ...item,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        set((state) => ({
          solutionLibrary: [...state.solutionLibrary, newItem]
        }))
      },

      updateSolutionItem: (id, updates) => {
        set((state) => ({
          solutionLibrary: state.solutionLibrary.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          )
        }))
      },

      deleteSolutionItem: (id) => {
        set((state) => ({
          solutionLibrary: state.solutionLibrary.filter((s) => s.id !== id),
          selectedSolutionId: state.selectedSolutionId === id ? null : state.selectedSolutionId
        }))
      },

      setSelectedSolutionId: (id) => set({ selectedSolutionId: id }),

      loadMovementFromArchive: (id) => {
        const { movementRecords } = get()
        const record = movementRecords.find((r) => r.id === id)
        if (record) {
          set({
            currentMainspring: record.mainspringParams,
            torqueAnalysis: record.torqueAnalysis,
            selectedMovementId: id
          })
        }
      },

      loadSolutionFromLibrary: (id) => {
        const { solutionLibrary } = get()
        const solution = solutionLibrary.find((s) => s.id === id)
        if (solution) {
          set({
            currentMainspring: solution.mainspringParams,
            selectedSolutionId: id
          })
          get().analyzeCurrentMainspring()
        }
      },

      exportSolutionToJson: async (id) => {
        const { solutionLibrary } = get()
        const solution = solutionLibrary.find((s) => s.id === id)
        if (!solution) return null

        if (window.electronAPI) {
          const filePath = await window.electronAPI.showSaveDialog(`${solution.name}.json`)
          if (filePath) {
            await window.electronAPI.saveJson(filePath, solution)
            return filePath
          }
        }
        return JSON.stringify(solution, null, 2)
      },

      importSolutionFromJson: (data) => {
        if (!data || typeof data !== 'object') {
          return { success: false, error: '数据不是有效对象' }
        }
        const obj = data as Record<string, unknown>
        const requiredTop = ['name', 'category', 'mainspringParams', 'expectedPerformance', 'barrelSpecs']
        for (const k of requiredTop) {
          if (!(k in obj) || obj[k] === null || obj[k] === undefined) {
            return { success: false, error: `缺少必需字段: ${k}` }
          }
        }
        const mp = obj.mainspringParams as Record<string, unknown>
        const requiredMp = ['thickness', 'length', 'width', 'barrelInnerDiameter', 'arborDiameter', 'material']
        for (const k of requiredMp) {
          if (!(k in mp)) {
            return { success: false, error: `发条参数缺少字段: ${k}` }
          }
          if (k !== 'material' && typeof mp[k] !== 'number') {
            return { success: false, error: `发条参数 ${k} 不是数值` }
          }
        }
        if (!mp.material || typeof mp.material !== 'object') {
          return { success: false, error: '发条参数缺少 material' }
        }
        const ep = obj.expectedPerformance as Record<string, unknown>
        const requiredEp = ['maxTorque', 'minTorque', 'averageTorque', 'torqueDropPercentage', 'powerReserveHours']
        for (const k of requiredEp) {
          if (!(k in ep) || typeof ep[k] !== 'number') {
            return { success: false, error: `性能参数缺少或无效: ${k}` }
          }
        }
        const bs = obj.barrelSpecs as Record<string, unknown>
        const requiredBs = ['innerDiameter', 'arborDiameter', 'width']
        for (const k of requiredBs) {
          if (!(k in bs) || typeof bs[k] !== 'number') {
            return { success: false, error: `条盒参数缺少或无效: ${k}` }
          }
        }

        const existingIds = get().solutionLibrary.map((s) => s.id)
        const rawItem = data as SolutionLibraryItem
        const newId = rawItem.id && !existingIds.includes(rawItem.id) ? rawItem.id : generateId()

        const newItem: SolutionLibraryItem = {
          id: newId,
          name: rawItem.name,
          category: rawItem.category,
          powerReserveLevel: rawItem.powerReserveLevel || `${Math.round(ep.powerReserveHours as number)}h`,
          targetPowerReserve: typeof rawItem.targetPowerReserve === 'number' ? rawItem.targetPowerReserve : (ep.powerReserveHours as number),
          mainspringParams: rawItem.mainspringParams,
          expectedPerformance: rawItem.expectedPerformance,
          barrelSpecs: rawItem.barrelSpecs,
          recommendedMovements: Array.isArray(rawItem.recommendedMovements) ? rawItem.recommendedMovements : [],
          material: typeof rawItem.material === 'string' ? rawItem.material : 'Nivaflex',
          notes: typeof rawItem.notes === 'string' ? rawItem.notes : '',
          isCustom: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        set((state) => ({
          solutionLibrary: [...state.solutionLibrary, newItem]
        }))
        return { success: true }
      }
    }),
    {
      name: 'mainspring-power-reserve-storage',
      partialize: (state) => ({
        currentMainspring: state.currentMainspring,
        movementRecords: state.movementRecords,
        solutionLibrary: state.solutionLibrary,
        analysisTemperature: state.analysisTemperature
      })
    }
  )
)
