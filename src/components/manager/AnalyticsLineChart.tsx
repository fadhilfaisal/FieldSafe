import { useId } from 'react'

export interface AnalyticsLineDatum {
  key: string
  label: string
  value: number
  detail?: string
  tooltipLines?: string[]
}

interface AnalyticsLineChartProps {
  data: AnalyticsLineDatum[]
  ariaLabel: string
  maximum?: number
  suffix?: string
  tone?: 'brand' | 'danger'
}

const toneColors = {
  brand: { line: '#0f62c9', fill: '#dbeafe' },
  danger: { line: '#dc2626', fill: '#fee2e2' },
}

function automaticMaximum(data: AnalyticsLineDatum[]) {
  const highest = Math.max(1, ...data.map((item) => item.value))
  const interval = highest <= 5 ? 1 : highest <= 20 ? 5 : 10
  return Math.ceil(highest / interval) * interval
}

export function AnalyticsLineChart({
  data,
  ariaLabel,
  maximum,
  suffix = '',
  tone = 'brand',
}: AnalyticsLineChartProps) {
  const titleId = useId()
  const descriptionId = useId()
  const width = 680
  const height = 280
  const left = 48
  const right = 20
  const top = 28
  const bottom = 48
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const chartMaximum = Math.max(1, maximum ?? automaticMaximum(data))
  const x = (index: number) =>
    data.length === 1
      ? left + plotWidth / 2
      : left + (index / Math.max(1, data.length - 1)) * plotWidth
  const y = (value: number) =>
    top + plotHeight - (Math.min(chartMaximum, value) / chartMaximum) * plotHeight
  const points = data.map((item, index) => `${x(index)},${y(item.value)}`)
  const colors = toneColors[tone]
  const ticks = [1, 0.75, 0.5, 0.25, 0]

  return (
    <figure data-testid={`${tone}-line-chart`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <title id={titleId}>{ariaLabel}</title>
        <desc id={descriptionId}>
          {data
            .map((item) => `${item.label}: ${item.value}${suffix}${item.detail ? `, ${item.detail}` : ''}`)
            .join('. ')}
        </desc>

        {ticks.map((tick) => {
          const tickValue = chartMaximum * tick
          const tickY = top + plotHeight * (1 - tick)
          return (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={tickY}
                y2={tickY}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={left - 10}
                y={tickY + 4}
                textAnchor="end"
                className="fill-slate-500 text-[11px] font-medium"
              >
                {Math.round(tickValue)}{suffix}
              </text>
            </g>
          )
        })}

        {points.length > 1 ? (
          <polygon
            points={`${left},${top + plotHeight} ${points.join(' ')} ${width - right},${top + plotHeight}`}
            fill={colors.fill}
            opacity="0.65"
          />
        ) : null}
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={colors.line}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {data.map((item, index) => {
          const pointX = x(index)
          const pointY = y(item.value)
          const tooltipWidth = 210
          const tooltipHeight = 66
          const tooltipX = Math.min(
            width - right - tooltipWidth,
            Math.max(left, pointX - tooltipWidth / 2),
          )
          const tooltipY =
            pointY - tooltipHeight - 14 < top
              ? pointY + 14
              : pointY - tooltipHeight - 14
          const tooltipLines =
            item.tooltipLines ?? [item.label, `${item.value}${suffix}`]
          return (
          <g
            key={item.key}
            className="group focus-visible:outline-none"
            tabIndex={0}
            aria-label={tooltipLines.join('. ')}
          >
            <circle
              cx={pointX}
              cy={pointY}
              r="10"
              fill="none"
              stroke="#93c5fd"
              strokeWidth="3"
              opacity="0"
              className="transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              data-chart-key={item.key}
              data-chart-value={item.value}
              cx={pointX}
              cy={pointY}
              r="5"
              fill="white"
              stroke={colors.line}
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={pointX}
              y={Math.max(16, pointY - 12)}
              textAnchor="middle"
              className="fill-slate-800 text-[11px] font-bold"
            >
              {item.value}{suffix}
            </text>
            <text
              x={pointX}
              y={height - 18}
              textAnchor="middle"
              className="fill-slate-500 text-[11px] font-medium"
            >
              {item.label}
            </text>
            <g
              role="tooltip"
              className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
            >
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
                rx="8"
                fill="#061c35"
              />
              <text x={tooltipX + 12} y={tooltipY + 19} className="fill-white text-[11px]">
                {tooltipLines.map((line, lineIndex) => (
                  <tspan
                    key={line}
                    x={tooltipX + 12}
                    dy={lineIndex === 0 ? 0 : 17}
                    className={lineIndex === 0 ? 'font-bold' : undefined}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          </g>
          )
        })}
      </svg>
    </figure>
  )
}
