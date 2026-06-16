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
  calculateTorqueCurve,
  MATERIALS
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
  importSolutionFromJson: (data: SolutionLibraryItem) => void
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
          const result = await window.electronAPI.showSaveDialog({
            title: '导出方案',
            defaultPath: `${solution.name}.json`,
            filters: [{ name: 'JSON 文件', extensions: ['json'] }]
          })
          if (!result.canceled && result.filePath) {
            await window.electronAPI.saveJson(result.filePath, solution)
            return result.filePath
          }
        }
        return JSON.stringify(solution, null, 2)
      },

      importSolutionFromJson: (data) => {
        const existingIds = get().solutionLibrary.map((s) => s.id)
        const newId = existingIds.includes(data.id) ? generateId() : data.id
        
        const newItem: SolutionLibraryItem = {
          ...data,
          id: newId,
          isCustom: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        set((state) => ({
          solutionLibrary: [...state.solutionLibrary, newItem]
        }))
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
