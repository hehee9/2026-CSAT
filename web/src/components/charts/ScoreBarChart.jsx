/**
 * @file ScoreBarChart.jsx
 * @brief 모델별 점수 가로 막대 차트 컴포넌트
 */

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Rectangle
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { getModelColor, getShortModelName, CHART_COLORS } from '@/utils/colorUtils'
import { useTheme } from '@/hooks/useTheme'
import { useExportImage } from '@/hooks/useExportImage'
import { ExportButton } from '@/components/common'

const MAX_LINE_LENGTH = 21
const MAX_LINES = 3

/**
 * @brief 텍스트를 최대 길이 기준으로 여러 줄로 분할 (최대 3줄)
 * @param {string} text - 분할할 텍스트
 * @param {number} maxLen - 줄당 최대 길이
 * @return {Array<string>} 분할된 줄 배열
 */
function _wrapText(text, maxLen) {
  if (text.length <= maxLen) return [text]

  const lines = []
  let remaining = text

  while (remaining.length > 0 && lines.length < MAX_LINES) {
    if (remaining.length <= maxLen || lines.length === MAX_LINES - 1) {
      lines.push(remaining)
      break
    }

    // 우선순위: 1. 콤마+공백 뒤, 2. 여는괄호 앞, 3. 일반 공백
    let breakPoint = -1

    // 1. 콤마+공백 뒤
    const commaIdx = remaining.lastIndexOf(', ', maxLen - 1)
    if (commaIdx > 0) {
      breakPoint = commaIdx + 1
    }

    // 2. 여는괄호 앞
    if (breakPoint <= 0) {
      const parenIdx = remaining.lastIndexOf(' (', maxLen - 1)
      if (parenIdx > 0) {
        breakPoint = parenIdx
      }
    }

    // 3. 일반 공백
    if (breakPoint <= 0) {
      breakPoint = remaining.lastIndexOf(' ', maxLen)
    }
    if (breakPoint <= 0) {
      breakPoint = maxLen
    }

    lines.push(remaining.slice(0, breakPoint).trim())
    remaining = remaining.slice(breakPoint).trim()
  }

  return lines
}

/**
 * @brief 커스텀 Y축 틱 컴포넌트 생성 함수
 * @param {string} hoveredModel - 현재 호버된 모델명
 * @param {function} onModelHover - 모델 호버 콜백
 * @param {boolean} darkMode - 다크모드 여부
 * @param {boolean} isMobile - 모바일 여부
 * @return {function} Recharts tick 렌더 함수
 */
function createCustomYAxisTick(hoveredModel, onModelHover, darkMode, isMobile) {
  const defaultColor = darkMode ? '#d1d5db' : '#374151'
  const hoverColor = darkMode ? '#60a5fa' : '#1d4ed8'

  return function CustomYAxisTick({ x, y, payload }) {
    // 모바일에서는 짧은 모델명 사용
    const displayName = isMobile ? getShortModelName(payload.value) : payload.value
    const lines = _wrapText(displayName, MAX_LINE_LENGTH)
    const lineHeight = 14
    const startY = -((lines.length - 1) * lineHeight) / 2 + 3
    const isHovered = hoveredModel === payload.value
    const hasHover = hoveredModel !== null

    return (
      <g
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => onModelHover?.(payload.value)}
        onMouseLeave={() => onModelHover?.(null)}
      >
        {/* 투명한 호버 영역 (텍스트보다 넓게) */}
        <rect
          x={x - 145}
          y={y - 20}
          width={150}
          height={40}
          fill="transparent"
        />
        <text
          x={x}
          y={y}
          textAnchor="end"
          fontSize={12}
          fill={isHovered ? hoverColor : defaultColor}
          fontWeight={isHovered ? 600 : 400}
          style={{
            opacity: hasHover ? (isHovered ? 1 : 0.5) : 1,
            transition: 'opacity 0.15s ease-in-out'
          }}
        >
          {lines.map((line, i) => (
            <tspan key={i} x={x} dy={i === 0 ? startY : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
    )
  }
}

/**
 * @brief 커스텀 툴팁 컴포넌트
 * @param {Object} props - { active, payload, t }
 */
function CustomTooltip({ active, payload, t }) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload
  const displayScore = Number.isInteger(data.score)
    ? data.score
    : parseFloat(data.score.toFixed(3))
  const accuracy = data.totalPoints > 0
    ? ((data.score / data.totalPoints) * 100).toFixed(1)
    : 0

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{data.model}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('tooltip.score')}: <span className="font-medium">{displayScore}</span> / {data.totalPoints}{t('tooltip.points')}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('tooltip.accuracy')}: <span className="font-medium">{accuracy}%</span>
      </p>
      {data.correctCount !== undefined && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('tooltip.correctCount')}: <span className="font-medium">{data.correctCount}</span> / {data.totalQuestions}{t('tooltip.totalQuestions')}
        </p>
      )}
    </div>
  )
}

/**
 * @brief 점수 막대 차트 컴포넌트
 * @param {Object} props - { data, maxScore, title, height, hoveredModel, onModelHover }
 * @param {Array} props.data - [{ model, score, totalPoints, correctCount?, totalQuestions? }]
 * @param {number} props.maxScore - 차트 X축 최대값 (기본: 데이터에서 자동 계산)
 * @param {string} props.title - 차트 제목
 * @param {number} props.height - 차트 높이 (기본: 400)
 * @param {string} props.hoveredModel - 현재 호버된 모델명
 * @param {function} props.onModelHover - 모델 호버 콜백
 */
export default function ScoreBarChart({
  data,
  maxScore,
  title,
  subtitle,
  height = 400,
  hoveredModel,
  onModelHover
}) {
  const { t } = useTranslation()
  const { isDark: darkMode } = useTheme()
  const { ref, exportImage } = useExportImage()

  // 모바일 감지
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        {t('common.noData')}
      </div>
    )
  }

  // 최대 점수 계산 (전달되지 않은 경우)
  const computedMaxScore = maxScore ?? Math.max(...data.map(d => d.totalPoints || d.score))

  // 동적 높이 계산: 모델 수에 따라 조정
  const dynamicHeight = Math.max(height, data.length * 40 + 60)

  // 다크모드용 색상
  const cursorColor = darkMode ? 'rgba(55, 65, 81, 0.5)' : '#f3f4f6'
  const axisColor = darkMode ? '#4b5563' : '#e5e7eb'

  return (
    <div ref={ref} className="w-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          {title && (
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
          )}
          {subtitle && (
            <p className="text-base text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-start gap-2">
          <span className="hidden text-base text-gray-400 mt-8" data-export-show="true">Github/hehee9</span>
          <ExportButton onClick={() => exportImage(`${t('export.totalScore')}.png`)} />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={dynamicHeight}>
        <BarChart
          key={data.map(d => d.model).join(',')}
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          onMouseMove={(state) => {
            if (state?.activeTooltipIndex !== undefined) {
              const model = data[state.activeTooltipIndex]?.model
              if (model && model !== hoveredModel) {
                onModelHover?.(model)
              }
            }
          }}
          onMouseLeave={() => onModelHover?.(null)}
        >
          <XAxis
            type="number"
            domain={[0, computedMaxScore]}
            tickLine={false}
            axisLine={{ stroke: axisColor }}
            tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }}
          />
          <YAxis
            type="category"
            dataKey="model"
            tickLine={false}
            axisLine={false}
            width={145}
            tick={createCustomYAxisTick(hoveredModel, onModelHover, darkMode, isMobile)}
          />
          <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: cursorColor }} />
          <ReferenceLine
            x={computedMaxScore}
            stroke={CHART_COLORS.perfect}
            strokeDasharray="3 3"
            strokeWidth={2}
          />
          <Bar
            dataKey="score"
            barSize={24}
            shape={(props) => {
              const { x, y, width, height, payload } = props
              const color = payload.color || getModelColor(payload.model)
              const isHovered = hoveredModel === payload.model
              const hasHover = hoveredModel !== null
              const opacity = hasHover ? (isHovered ? 1 : 0.3) : 1
              return (
                <Rectangle
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={color}
                  radius={[0, 4, 4, 0]}
                  opacity={opacity}
                  style={{ transition: 'opacity 0.15s ease-in-out' }}
                />
              )
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
