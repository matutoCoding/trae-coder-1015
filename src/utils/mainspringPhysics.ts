export interface MainspringParams {
  thickness: number
  length: number
  width: number
  barrelInnerDiameter: number
  arborDiameter: number
  elasticModulus: number
  yieldStrength: number
  material: MainspringMaterial
}

export interface MainspringMaterial {
  name: string
  elasticModulus20C: number
  thermalExpansionCoeff: number
  temperatureCoeff: number
  density: number
  maxAllowableStress: number
}

export const MATERIALS: Record<string, MainspringMaterial> = {
  Nivaflex: {
    name: 'Nivaflex (钴基合金)',
    elasticModulus20C: 190e9,
    thermalExpansionCoeff: 12e-6,
    temperatureCoeff: -0.02e-2,
    density: 8900,
    maxAllowableStress: 2800e6
  },
  Etastan: {
    name: 'Etastan (铁镍合金)',
    elasticModulus20C: 175e9,
    thermalExpansionCoeff: 10e-6,
    temperatureCoeff: -0.015e-2,
    density: 8200,
    maxAllowableStress: 2500e6
  },
  Spron: {
    name: 'Spron (钴铬合金)',
    elasticModulus20C: 200e9,
    thermalExpansionCoeff: 11e-6,
    temperatureCoeff: -0.018e-2,
    density: 8700,
    maxAllowableStress: 3000e6
  },
  CarbonSteel: {
    name: '碳素弹簧钢',
    elasticModulus20C: 206e9,
    thermalExpansionCoeff: 11.5e-6,
    temperatureCoeff: -0.03e-2,
    density: 7850,
    maxAllowableStress: 1800e6
  },
  StainlessSteel: {
    name: '不锈钢',
    elasticModulus20C: 193e9,
    thermalExpansionCoeff: 17e-6,
    temperatureCoeff: -0.025e-2,
    density: 7900,
    maxAllowableStress: 2000e6
  }
}

export interface TorquePoint {
  angle: number
  torque: number
  turns: number
  isWarningZone: boolean
  isDangerZone: boolean
}

export interface WindingGeometry {
  turnsFullyWound: number
  turnsUnwound: number
  totalTurns: number
  innerRadiusAtTurn: (turn: number) => number
  outerRadiusAtTurn: (turn: number) => number
  barrelFillRatio: number
  hasStackingRisk: boolean
  stackingWarning: string | null
}

export interface TorqueAnalysisResult {
  torqueCurve: TorquePoint[]
  maxTorque: number
  minTorque: number
  averageTorque: number
  torqueDropPercentage: number
  decayRate: number
  warningZones: Array<{ startTurn: number; endTurn: number; reason: string }>
  dangerZones: Array<{ startTurn: number; endTurn: number; reason: string }>
  geometry: WindingGeometry
  powerReserveHours: number
  escapementImpactRisk: boolean
  impactRiskDescription: string | null
}

export interface FuseeParams {
  type: 'fusee' | 'constantForce' | 'remontoire'
  stages: number
  minRadius: number
  maxRadius: number
  transmissionRatio: number
}

export interface CompensationResult {
  originalCurve: TorquePoint[]
  compensatedCurve: TorquePoint[]
  torqueUniformity: number
  averageCompensatedTorque: number
  maxDeviation: number
  improvementPercentage: number
}

export interface TemperatureAnalysisResult {
  temperature: number
  powerReserveHours: number
  effectiveElasticModulus: number
  torqueMultiplier: number
  maxTorque: number
  minTorque: number
}

export interface ReverseCalculationResult {
  thickness: number
  length: number
  width: number
  estimatedPowerReserve: number
  estimatedMaxTorque: number
  estimatedMinTorque: number
  barrelFillRatio: number
  isValid: boolean
  warnings: string[]
}

export function calculateElasticModulus(material: MainspringMaterial, temperature: number): number {
  const deltaT = temperature - 20
  return material.elasticModulus20C * (1 + material.temperatureCoeff * deltaT)
}

export function calculateWindingGeometry(params: MainspringParams): WindingGeometry {
  const { thickness, length, barrelInnerDiameter, arborDiameter } = params
  const barrelInnerRadius = barrelInnerDiameter / 2
  const arborRadius = arborDiameter / 2

  const availableArea = Math.PI * (barrelInnerRadius ** 2 - arborRadius ** 2)
  const springCrossSectionArea = length * thickness
  const barrelFillRatio = springCrossSectionArea / availableArea

  const turnsFullyWound = (barrelInnerRadius - arborRadius) / thickness
  const turnsUnwound = Math.max(1, turnsFullyWound - length / (2 * Math.PI * barrelInnerRadius))
  const totalTurns = turnsFullyWound - turnsUnwound

  const innerRadiusAtTurn = (turn: number): number => {
    return arborRadius + turn * thickness
  }

  const outerRadiusAtTurn = (turn: number): number => {
    return arborRadius + (turn + 1) * thickness
  }

  let hasStackingRisk = false
  let stackingWarning: string | null = null

  if (barrelFillRatio > 0.95) {
    hasStackingRisk = true
    stackingWarning = `条盒填充率过高 (${(barrelFillRatio * 100).toFixed(1)}%)，可能导致发条堆叠咬死`
  } else if (barrelFillRatio < 0.6) {
    hasStackingRisk = true
    stackingWarning = `条盒填充率过低 (${(barrelFillRatio * 100).toFixed(1)}%)，空间利用率不足`
  }

  const theoreticalMaxTurns = (barrelInnerRadius - arborRadius) / thickness
  const actualTurns = length / (2 * Math.PI * ((barrelInnerRadius + arborRadius) / 2))
  
  if (actualTurns > theoreticalMaxTurns * 0.98) {
    hasStackingRisk = true
    stackingWarning = stackingWarning || '发条长度过长，满卷时可能发生层间咬死'
  }

  return {
    turnsFullyWound,
    turnsUnwound,
    totalTurns,
    innerRadiusAtTurn,
    outerRadiusAtTurn,
    barrelFillRatio,
    hasStackingRisk,
    stackingWarning
  }
}

export function calculateTorqueCurve(
  params: MainspringParams,
  temperature: number = 20,
  points: number = 200
): TorqueAnalysisResult {
  const { thickness, length, width, barrelInnerDiameter, arborDiameter, material } = params
  const barrelInnerRadius = barrelInnerDiameter / 2
  const arborRadius = arborDiameter / 2

  const E = calculateElasticModulus(material, temperature)
  const geometry = calculateWindingGeometry(params)

  const torqueCurve: TorquePoint[] = []
  const warningZones: Array<{ startTurn: number; endTurn: number; reason: string }> = []
  const dangerZones: Array<{ startTurn: number; endTurn: number; reason: string }> = []

  const totalTurns = geometry.totalTurns
  const torquePerTurn = (E * width * thickness ** 3) / (12 * barrelInnerRadius)

  let prevTorque = 0
  let decayStartTurn = -1

  for (let i = 0; i <= points; i++) {
    const turnRatio = i / points
    const currentTurn = geometry.turnsUnwound + turnRatio * totalTurns
    const angle = currentTurn * 2 * Math.PI

    const unwoundLength = turnRatio * length
    const effectiveRadius = arborRadius + (geometry.turnsFullyWound - currentTurn) * thickness / 2
    
    const bendingStress = (E * thickness) / (2 * effectiveRadius)
    const stressRatio = bendingStress / material.maxAllowableStress

    const geometricFactor = 1 - 0.15 * Math.exp(-turnRatio * 3)
    const torque = torquePerTurn * (1 - turnRatio) * geometricFactor * Math.max(0.1, 1 - stressRatio * 0.3)

    let isWarningZone = false
    let isDangerZone = false

    if (i > 0) {
      const torqueDrop = (prevTorque - torque) / prevTorque
      const turnThreshold = 0.7

      if (turnRatio > turnThreshold && torqueDrop > 0.02) {
        if (decayStartTurn < 0) decayStartTurn = turnRatio
        isWarningZone = true

        if (torqueDrop > 0.05) {
          isDangerZone = true
        }
      } else if (decayStartTurn >= 0 && torqueDrop <= 0.02) {
        const endTurn = turnRatio
        const zoneType = torqueDrop > 0.05 ? dangerZones : warningZones
        zoneType.push({
          startTurn: decayStartTurn,
          endTurn,
          reason: `力矩衰减过快，后段摆幅可能下跌超过 ${(torqueDrop * 100).toFixed(1)}%`
        })
        decayStartTurn = -1
      }
    }

    torqueCurve.push({
      angle,
      torque,
      turns: currentTurn - geometry.turnsUnwound,
      isWarningZone,
      isDangerZone
    })

    prevTorque = torque
  }

  if (decayStartTurn >= 0) {
    warningZones.push({
      startTurn: decayStartTurn,
      endTurn: 1,
      reason: '末端力矩快速衰减区域'
    })
  }

  const torques = torqueCurve.map(p => p.torque)
  const maxTorque = Math.max(...torques)
  const minTorque = Math.min(...torques)
  const averageTorque = torques.reduce((a, b) => a + b, 0) / torques.length
  const torqueDropPercentage = ((maxTorque - minTorque) / maxTorque) * 100

  const firstHalfAvg = torques.slice(0, points / 2).reduce((a, b) => a + b, 0) / (points / 2)
  const secondHalfAvg = torques.slice(points / 2).reduce((a, b) => a + b, 0) / (points / 2)
  const decayRate = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100

  const typicalEscapementConsumption = 1.5e-6
  const energyStored = 0.5 * E * width * thickness ** 3 * length / (12 * barrelInnerRadius ** 2)
  const powerReserveHours = (energyStored / (typicalEscapementConsumption * averageTorque)) / 3600

  let escapementImpactRisk = false
  let impactRiskDescription: string | null = null

  const maxSafeTorque = 5e-3
  if (maxTorque > maxSafeTorque) {
    escapementImpactRisk = true
    const excessPercentage = ((maxTorque - maxSafeTorque) / maxSafeTorque) * 100
    impactRiskDescription = `满弦力矩 ${(maxTorque * 1000).toFixed(2)} mN·m 超出安全阈值 ${(maxSafeTorque * 1000).toFixed(2)} mN·m ${excessPercentage.toFixed(1)}%，可能对擒纵机构造成冲击损伤`
  }

  return {
    torqueCurve,
    maxTorque,
    minTorque,
    averageTorque,
    torqueDropPercentage,
    decayRate,
    warningZones,
    dangerZones,
    geometry,
    powerReserveHours,
    escapementImpactRisk,
    impactRiskDescription
  }
}

export function calculateFuseeCompensation(
  torqueResult: TorqueAnalysisResult,
  fuseeParams: FuseeParams
): CompensationResult {
  const { torqueCurve, maxTorque, minTorque } = torqueResult
  const { type, stages, minRadius, maxRadius, transmissionRatio } = fuseeParams

  const compensatedCurve: TorquePoint[] = []
  const radiusStep = (maxRadius - minRadius) / stages

  torqueCurve.forEach((point, index) => {
    const progress = index / (torqueCurve.length - 1)
    let compensationFactor = 1

    if (type === 'fusee') {
      const currentRadius = maxRadius - progress * (maxRadius - minRadius)
      const stageIndex = Math.min(stages - 1, Math.floor(progress * stages))
      const stageRadius = maxRadius - stageIndex * radiusStep
      compensationFactor = (maxRadius / stageRadius) * transmissionRatio
    } else if (type === 'constantForce') {
      const idealFactor = maxTorque / point.torque
      compensationFactor = Math.max(0.8, Math.min(1.5, idealFactor)) * transmissionRatio
    } else if (type === 'remontoire') {
      const cycleProgress = (progress * 10) % 1
      const remontoireFactor = 1 - 0.1 * Math.sin(cycleProgress * Math.PI)
      compensationFactor = remontoireFactor * transmissionRatio
    }

    const compensatedTorque = point.torque * compensationFactor

    compensatedCurve.push({
      ...point,
      torque: compensatedTorque
    })
  })

  const originalTorques = torqueCurve.map(p => p.torque)
  const compensatedTorques = compensatedCurve.map(p => p.torque)

  const originalVariance = originalTorques.reduce((sum, t) => sum + (t - torqueResult.averageTorque) ** 2, 0) / originalTorques.length
  const avgCompensated = compensatedTorques.reduce((a, b) => a + b, 0) / compensatedTorques.length
  const compensatedVariance = compensatedTorques.reduce((sum, t) => sum + (t - avgCompensated) ** 2, 0) / compensatedTorques.length

  const torqueUniformity = 1 - Math.sqrt(compensatedVariance) / avgCompensated
  const improvementPercentage = ((originalVariance - compensatedVariance) / originalVariance) * 100

  const maxCompensated = Math.max(...compensatedTorques)
  const minCompensated = Math.min(...compensatedTorques)
  const maxDeviation = Math.max(Math.abs(maxCompensated - avgCompensated), Math.abs(minCompensated - avgCompensated))

  return {
    originalCurve: torqueCurve,
    compensatedCurve,
    torqueUniformity,
    averageCompensatedTorque: avgCompensated,
    maxDeviation,
    improvementPercentage
  }
}

export function calculateTemperatureInfluence(
  params: MainspringParams,
  temperatureRange: { min: number; max: number; step: number } = { min: -10, max: 60, step: 5 }
): TemperatureAnalysisResult[] {
  const results: TemperatureAnalysisResult[] = []

  for (let T = temperatureRange.min; T <= temperatureRange.max; T += temperatureRange.step) {
    const torqueResult = calculateTorqueCurve(params, T)
    const E = calculateElasticModulus(params.material, T)
    const torqueMultiplier = E / params.material.elasticModulus20C

    results.push({
      temperature: T,
      powerReserveHours: torqueResult.powerReserveHours * torqueMultiplier,
      effectiveElasticModulus: E,
      torqueMultiplier,
      maxTorque: torqueResult.maxTorque,
      minTorque: torqueResult.minTorque
    })
  }

  return results
}

export function reverseCalculateMainspring(
  targetPowerReserve: number,
  barrelInnerDiameter: number,
  arborDiameter: number,
  material: MainspringMaterial,
  width: number,
  constraints: {
    minThickness: number
    maxThickness: number
    minLength: number
    maxLength: number
    targetTorque?: number
  }
): ReverseCalculationResult[] {
  const results: ReverseCalculationResult[] = []
  const { minThickness, maxThickness, minLength, maxLength, targetTorque } = constraints

  const thicknessStep = 0.01e-3
  const lengthStep = 10e-3

  for (let thickness = minThickness; thickness <= maxThickness; thickness += thicknessStep) {
    for (let length = minLength; length <= maxLength; length += lengthStep) {
      const params: MainspringParams = {
        thickness,
        length,
        width,
        barrelInnerDiameter,
        arborDiameter,
        elasticModulus: material.elasticModulus20C,
        yieldStrength: material.maxAllowableStress,
        material
      }

      const torqueResult = calculateTorqueCurve(params)
      const geometry = calculateWindingGeometry(params)

      const warnings: string[] = []
      let isValid = true

      if (geometry.hasStackingRisk && geometry.stackingWarning) {
        warnings.push(geometry.stackingWarning)
      }

      if (Math.abs(torqueResult.powerReserveHours - targetPowerReserve) / targetPowerReserve > 0.1) {
        isValid = false
      }

      if (targetTorque) {
        if (Math.abs(torqueResult.averageTorque - targetTorque) / targetTorque > 0.15) {
          isValid = false
        }
      }

      if (torqueResult.torqueDropPercentage > 60) {
        warnings.push(`力矩衰减过大 (${torqueResult.torqueDropPercentage.toFixed(1)}%)`)
      }

      if (isValid || warnings.length === 0) {
        results.push({
          thickness,
          length,
          width,
          estimatedPowerReserve: torqueResult.powerReserveHours,
          estimatedMaxTorque: torqueResult.maxTorque,
          estimatedMinTorque: torqueResult.minTorque,
          barrelFillRatio: geometry.barrelFillRatio,
          isValid,
          warnings
        })
      }
    }
  }

  return results.sort((a, b) => {
    const aError = Math.abs(a.estimatedPowerReserve - targetPowerReserve)
    const bError = Math.abs(b.estimatedPowerReserve - targetPowerReserve)
    return aError - bError
  }).slice(0, 10)
}
