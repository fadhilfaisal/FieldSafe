export type MetricTooltipPlacement = 'left' | 'center' | 'right'

export function getMetricTooltipPlacement(
  buttonLeft: number,
  buttonWidth: number,
  viewportWidth: number,
  tooltipWidth = 224,
): MetricTooltipPlacement {
  const viewportInset = 16
  const center = buttonLeft + buttonWidth / 2
  if (center - tooltipWidth / 2 < viewportInset) return 'left'
  if (center + tooltipWidth / 2 > viewportWidth - viewportInset) return 'right'
  return 'center'
}
