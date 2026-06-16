import { MainspringParams, TorqueAnalysisResult, MainspringMaterial } from '@/utils/mainspringPhysics'

export interface MovementRecord {
  id: string
  name: string
  model: string
  manufacturer: string
  caliber: string
  createdAt: string
  updatedAt: string
  mainspringParams: MainspringParams
  torqueAnalysis: TorqueAnalysisResult
  measuredPowerReserve?: number
  measuredTiming?: Array<{
    position: string
    hours: number
    rate: number
    amplitude: number
    beatError: number
  }>
  notes?: string
  temperatureData?: Array<{
    temperature: number
    measuredReserve: number
    measuredRate: number
  }>
}

export interface SolutionLibraryItem {
  id: string
  name: string
  category: 'standard' | 'long' | 'ultra-long' | 'special'
  powerReserveLevel: string
  targetPowerReserve: number
  mainspringParams: MainspringParams
  expectedPerformance: {
    maxTorque: number
    minTorque: number
    averageTorque: number
    torqueDropPercentage: number
    powerReserveHours: number
  }
  barrelSpecs: {
    innerDiameter: number
    arborDiameter: number
    width: number
  }
  recommendedMovements: string[]
  material: string
  createdAt: string
  updatedAt: string
  notes?: string
  isCustom: boolean
}

export interface AppState {
  currentMainspring: MainspringParams | null
  torqueAnalysis: TorqueAnalysisResult | null
  movementRecords: MovementRecord[]
  solutionLibrary: SolutionLibraryItem[]
  selectedMovementId: string | null
  selectedSolutionId: string | null
  analysisTemperature: number
  currentPage: 'input' | 'torque' | 'compensation' | 'archive' | 'library'
}

export const DEFAULT_MAINSPRING: MainspringParams = {
  thickness: 0.18e-3,
  length: 350e-3,
  width: 1.2e-3,
  barrelInnerDiameter: 10.5e-3,
  arborDiameter: 1.8e-3,
  elasticModulus: 190e9,
  yieldStrength: 2800e6,
  material: {
    name: 'Nivaflex (钴基合金)',
    elasticModulus20C: 190e9,
    thermalExpansionCoeff: 12e-6,
    temperatureCoeff: -0.02e-2,
    density: 8900,
    maxAllowableStress: 2800e6
  }
}

export const POWER_RESERVE_CATEGORIES = [
  { key: '36h', label: '标准动储 (36-48小时)', min: 36, max: 48 },
  { key: '72h', label: '长动力 (72-100小时)', min: 72, max: 100 },
  { key: '120h', label: '超长动力 (120小时以上)', min: 120, max: 336 },
  { key: '7d', label: '一周动力 (7天)', min: 168, max: 168 },
  { key: '31d', label: '月相动力 (31天)', min: 744, max: 744 }
]

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function createDefaultSolutions(): SolutionLibraryItem[] {
  const nivaflex: MainspringMaterial = {
    name: 'Nivaflex (钴基合金)',
    elasticModulus20C: 190e9,
    thermalExpansionCoeff: 12e-6,
    temperatureCoeff: -0.02e-2,
    density: 8900,
    maxAllowableStress: 2800e6
  }

  return [
    {
      id: generateId(),
      name: '标准三针机芯配置',
      category: 'standard',
      powerReserveLevel: '42h',
      targetPowerReserve: 42,
      mainspringParams: {
        thickness: 0.16e-3,
        length: 320e-3,
        width: 1.0e-3,
        barrelInnerDiameter: 9.8e-3,
        arborDiameter: 1.6e-3,
        elasticModulus: nivaflex.elasticModulus20C,
        yieldStrength: nivaflex.maxAllowableStress,
        material: nivaflex
      },
      expectedPerformance: {
        maxTorque: 3.2e-3,
        minTorque: 1.8e-3,
        averageTorque: 2.5e-3,
        torqueDropPercentage: 43.75,
        powerReserveHours: 42
      },
      barrelSpecs: {
        innerDiameter: 9.8e-3,
        arborDiameter: 1.6e-3,
        width: 1.0e-3
      },
      recommendedMovements: ['ETA 2824-2', 'SW 200', 'Sellita SW300'],
      material: 'Nivaflex',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: '经典配置，适用于大多数三针自动机芯',
      isCustom: false
    },
    {
      id: generateId(),
      name: '三日链基础配置',
      category: 'long',
      powerReserveLevel: '72h',
      targetPowerReserve: 72,
      mainspringParams: {
        thickness: 0.18e-3,
        length: 520e-3,
        width: 1.1e-3,
        barrelInnerDiameter: 11.5e-3,
        arborDiameter: 1.8e-3,
        elasticModulus: nivaflex.elasticModulus20C,
        yieldStrength: nivaflex.maxAllowableStress,
        material: nivaflex
      },
      expectedPerformance: {
        maxTorque: 3.8e-3,
        minTorque: 2.0e-3,
        averageTorque: 2.9e-3,
        torqueDropPercentage: 47.37,
        powerReserveHours: 72
      },
      barrelSpecs: {
        innerDiameter: 11.5e-3,
        arborDiameter: 1.8e-3,
        width: 1.1e-3
      },
      recommendedMovements: ['Powermatic 80', 'Cal. 3235', 'ML115'],
      material: 'Nivaflex',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: '三日链标准配置，需要更大的条盒容纳更长发条',
      isCustom: false
    },
    {
      id: generateId(),
      name: '五日链高端配置',
      category: 'ultra-long',
      powerReserveLevel: '120h',
      targetPowerReserve: 120,
      mainspringParams: {
        thickness: 0.20e-3,
        length: 780e-3,
        width: 1.2e-3,
        barrelInnerDiameter: 13.0e-3,
        arborDiameter: 2.0e-3,
        elasticModulus: nivaflex.elasticModulus20C,
        yieldStrength: nivaflex.maxAllowableStress,
        material: nivaflex
      },
      expectedPerformance: {
        maxTorque: 4.5e-3,
        minTorque: 2.2e-3,
        averageTorque: 3.35e-3,
        torqueDropPercentage: 51.11,
        powerReserveHours: 120
      },
      barrelSpecs: {
        innerDiameter: 13.0e-3,
        arborDiameter: 2.0e-3,
        width: 1.2e-3
      },
      recommendedMovements: ['Cal. 240 Q', 'L093.1', 'JLC 899'],
      material: 'Nivaflex',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: '高端五日链配置，建议配合均力轮使用以保证走时精度',
      isCustom: false
    },
    {
      id: generateId(),
      name: '一周动力配置',
      category: 'ultra-long',
      powerReserveLevel: '168h',
      targetPowerReserve: 168,
      mainspringParams: {
        thickness: 0.22e-3,
        length: 950e-3,
        width: 1.3e-3,
        barrelInnerDiameter: 14.5e-3,
        arborDiameter: 2.2e-3,
        elasticModulus: nivaflex.elasticModulus20C,
        yieldStrength: nivaflex.maxAllowableStress,
        material: nivaflex
      },
      expectedPerformance: {
        maxTorque: 5.2e-3,
        minTorque: 2.4e-3,
        averageTorque: 3.8e-3,
        torqueDropPercentage: 53.85,
        powerReserveHours: 168
      },
      barrelSpecs: {
        innerDiameter: 14.5e-3,
        arborDiameter: 2.2e-3,
        width: 1.3e-3
      },
      recommendedMovements: ['P.3000', 'L.U.C 1.98', 'ML 190'],
      material: 'Nivaflex',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: '七日链配置，需配合双发条盒或特殊均力装置',
      isCustom: false
    },
    {
      id: generateId(),
      name: '月相动力特殊配置',
      category: 'special',
      powerReserveLevel: '744h',
      targetPowerReserve: 744,
      mainspringParams: {
        thickness: 0.25e-3,
        length: 3500e-3,
        width: 1.5e-3,
        barrelInnerDiameter: 20.0e-3,
        arborDiameter: 3.0e-3,
        elasticModulus: nivaflex.elasticModulus20C,
        yieldStrength: nivaflex.maxAllowableStress,
        material: nivaflex
      },
      expectedPerformance: {
        maxTorque: 6.0e-3,
        minTorque: 2.8e-3,
        averageTorque: 4.4e-3,
        torqueDropPercentage: 53.33,
        powerReserveHours: 744
      },
      barrelSpecs: {
        innerDiameter: 20.0e-3,
        arborDiameter: 3.0e-3,
        width: 1.5e-3
      },
      recommendedMovements: ['定制款'],
      material: 'Nivaflex',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: '31天超长动力配置，需要多条发盒并联，必须配合均力装置使用',
      isCustom: false
    }
  ]
}
