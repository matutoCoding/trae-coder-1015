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
  exportSolutionToJson: (id: string) => Promise<{ success: boolean; error?: string; filePath?: string }>
  importSolutionFromJson: (data: unknown) => { success: boolean; error?: string }
  clearCompensationResult: () => void
  setCompensationResult: (
    result: import('@/utils/mainspringPhysics').CompensationResult | null,
    snapshot?: string | null
  ) => void
  compensationSnapshot: string | null
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentMainspring: DEFAULT_MAINSPRING,
      torqueAnalysis: null,
      compensationResult: null,
      compensationSnapshot: null,
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

      clearCompensationResult: () => {
        set({ compensationResult: null, compensationSnapshot: null })
      },

      setCompensationResult: (result, snapshot) => {
        if (snapshot === undefined) {
          set({ compensationResult: result })
        } else {
          set({ compensationResult: result, compensationSnapshot: snapshot })
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
        if (!solution) {
          return { success: false, error: '方案不存在' }
        }

        if (window.electronAPI) {
          const filePath = await window.electronAPI.showSaveDialog(`${solution.name}.json`)
          if (!filePath) {
            return { success: false }
          }
          const result = await window.electronAPI.saveJson(filePath, solution)
          if (result.success) {
            return { success: true, filePath }
          }
          return { success: false, error: result.error || '保存失败' }
        }

        try {
          const jsonStr = JSON.stringify(solution, null, 2)
          const blob = new Blob([jsonStr], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${solution.name}.json`
          link.click()
          URL.revokeObjectURL(url)
          return { success: true, filePath: `${solution.name}.json` }
        } catch {
          return { success: false, error: '导出失败' }
        }
      },

      importSolutionFromJson: (data) => {
        const isFiniteNumber = (v: unknown): v is number =>
          typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v)
        const isNonEmptyString = (v: unknown): v is string =>
          typeof v === 'string' && v.trim().length > 0

        if (!data || typeof data !== 'object') {
          return { success: false, error: '文件内容不是有效对象' }
        }
        const obj = data as Record<string, unknown>

        if (!isNonEmptyString(obj.name)) {
          return { success: false, error: '字段 name 必须是非空字符串' }
        }
        if (!isNonEmptyString(obj.category)) {
          return { success: false, error: '字段 category 必须是非空字符串' }
        }

        const requiredTop = ['mainspringParams', 'expectedPerformance', 'barrelSpecs']
        for (const k of requiredTop) {
          if (!(k in obj) || obj[k] === null || typeof obj[k] !== 'object') {
            return { success: false, error: `缺少必需对象字段: ${k}` }
          }
        }

        const mp = obj.mainspringParams as Record<string, unknown>
        const requiredMpNumbers = [
          { key: 'thickness', min: 1e-6, max: 0.01 },
          { key: 'length', min: 1e-3, max: 5 },
          { key: 'width', min: 1e-4, max: 0.1 },
          { key: 'barrelInnerDiameter', min: 1e-3, max: 0.1 },
          { key: 'arborDiameter', min: 1e-4, max: 0.05 }
        ]
        for (const { key, min, max } of requiredMpNumbers) {
          const v = mp[key]
          if (!isFiniteNumber(v)) {
            return { success: false, error: `发条参数 ${key} 必须是有效数值（当前为 ${typeof v}）` }
          }
          if (v <= min || v >= max) {
            return { success: false, error: `发条参数 ${key} = ${v} 超出合理范围 [${min}, ${max}]` }
          }
        }
        if (!mp.material || typeof mp.material !== 'object') {
          return { success: false, error: '发条参数 material 必须是对象' }
        }
        const mat = mp.material as Record<string, unknown>
        if (!isNonEmptyString(mat.name)) {
          return { success: false, error: '发条 material.name 必须是非空字符串' }
        }

        const ep = obj.expectedPerformance as Record<string, unknown>
        const requiredEpNumbers = [
          { key: 'maxTorque', min: 0, max: 1000 },
          { key: 'minTorque', min: 0, max: 1000 },
          { key: 'averageTorque', min: 0, max: 1000 },
          { key: 'torqueDropPercentage', min: 0, max: 100 },
          { key: 'powerReserveHours', min: 1, max: 5000 }
        ]
        for (const { key, min, max } of requiredEpNumbers) {
          const v = ep[key]
          if (!isFiniteNumber(v)) {
            return { success: false, error: `性能参数 ${key} 必须是有效数值（当前为 ${typeof v}）` }
          }
          if (v < min || v > max) {
            return { success: false, error: `性能参数 ${key} = ${v} 超出合理范围 [${min}, ${max}]` }
          }
        }

        const bs = obj.barrelSpecs as Record<string, unknown>
        const requiredBsNumbers = [
          { key: 'innerDiameter', min: 1e-3, max: 0.1 },
          { key: 'arborDiameter', min: 1e-4, max: 0.05 },
          { key: 'width', min: 1e-4, max: 0.1 }
        ]
        for (const { key, min, max } of requiredBsNumbers) {
          const v = bs[key]
          if (!isFiniteNumber(v)) {
            return { success: false, error: `条盒参数 ${key} 必须是有效数值（当前为 ${typeof v}）` }
          }
          if (v < min || v > max) {
            return { success: false, error: `条盒参数 ${key} = ${v} 超出合理范围 [${min}, ${max}]` }
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
        analysisTemperature: state.analysisTemperature,
        compensationResult: state.compensationResult,
        compensationSnapshot: state.compensationSnapshot
      })
    }
  )
)
