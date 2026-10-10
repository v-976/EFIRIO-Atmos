import type {
  ConditionalPrecipitationAmount,
  EnsemblePrecipitationStatistics,
  EnsembleRangeStatistics,
} from './ensembleTypes'

export const LOWER_QUANTILE = 0.1 as const
export const UPPER_QUANTILE = 0.9 as const
export const PRECIPITATION_EVENT_THRESHOLD_MM = 0.1 as const
export const MINIMUM_VALID_MEMBER_COUNT = 10
export const MINIMUM_VALID_MEMBER_FRACTION = 0.8
export const MINIMUM_CONDITIONAL_EVENT_MEMBERS = 3

function finiteValues(values: Array<number | null>): number[] {
  return values.filter((value): value is number => value !== null && Number.isFinite(value))
}

export function quantile(sortedValues: number[], probability: number): number {
  const position = (sortedValues.length - 1) * probability
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  if (lowerIndex === upperIndex) return sortedValues[lowerIndex]
  const weight = position - lowerIndex
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight
}

export function calculateConditionalPrecipitationAmount(
  values: Array<number | null>,
): ConditionalPrecipitationAmount | null {
  const available = finiteValues(values).sort((a, b) => a - b)
  return available.length >= MINIMUM_CONDITIONAL_EVENT_MEMBERS
    ? {
        lower: quantile(available, LOWER_QUANTILE),
        median: quantile(available, 0.5),
        upper: quantile(available, UPPER_QUANTILE),
        eventMemberCount: available.length,
      }
    : null
}

export function requiredValidMembers(totalMemberCount: number): number {
  return Math.max(MINIMUM_VALID_MEMBER_COUNT, Math.ceil(totalMemberCount * MINIMUM_VALID_MEMBER_FRACTION))
}

export function calculateRangeStatistics(
  values: Array<number | null>,
  totalMemberCount: number,
): EnsembleRangeStatistics {
  const available = finiteValues(values).sort((a, b) => a - b)
  const isSufficient = available.length >= requiredValidMembers(totalMemberCount)
  return {
    lowerQuantile: LOWER_QUANTILE,
    upperQuantile: UPPER_QUANTILE,
    lower: isSufficient ? quantile(available, LOWER_QUANTILE) : null,
    median: isSufficient ? quantile(available, 0.5) : null,
    upper: isSufficient ? quantile(available, UPPER_QUANTILE) : null,
    absoluteMin: isSufficient ? available[0] : null,
    absoluteMax: isSufficient ? available[available.length - 1] : null,
    validMemberCount: available.length,
    totalMemberCount,
    isSufficient,
  }
}

export function calculatePrecipitationStatistics(
  values: Array<number | null>,
  totalMemberCount: number,
): EnsemblePrecipitationStatistics {
  const available = finiteValues(values)
  const isSufficient = available.length >= requiredValidMembers(totalMemberCount)
  const eventValues = available
    .filter((value) => value > PRECIPITATION_EVENT_THRESHOLD_MM)
    .sort((a, b) => a - b)
  const conditionalAmount = calculateConditionalPrecipitationAmount(eventValues)

  return {
    amount: calculateRangeStatistics(values, totalMemberCount),
    probability: {
      value: isSufficient ? (eventValues.length / available.length) * 100 : null,
      eventThresholdMm: PRECIPITATION_EVENT_THRESHOLD_MM,
      comparison: 'greater-than',
      eventMemberCount: eventValues.length,
      validMemberCount: available.length,
      totalMemberCount,
    },
    conditionalAmount,
  }
}
