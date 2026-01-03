/**
 * @file CostScatterChart.jsx
 * @brief 비용 vs 성능 산점도 차트 컴포넌트
 */

import { useState, useEffect } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  LabelList
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { getModelColor } from '@/utils/colorUtils'
import { useTheme } from '@/hooks/useTheme'
import { useExportImage } from '@/hooks/useExportImage'
import { ExportButton } from '@/components/common'

/**
 * @brief 커스텀 툴팁 컴포넌트
 * @param {Object} props - { active, payload, t }
 */
function CustomTooltip({ active, payload, t }) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{data.model}</p>
      <div className="space-y-1 text-sm">
        <p className="text-gray-600 dark:text-gray-400">
          {t('table.score')}: <span className="font-medium">{data.score?.toFixed(1)}</span>{t('common.points')}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          {t('cost.testCost')}: <span className="font-medium">${data.totalCost?.toFixed(4)}</span>
        </p>
        {data.inputTokens > 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            {t('cost.inputTokensShort')}: {(data.inputTokens / 1000).toFixed(1)}K {t('cost.tokens')} (${data.inputPrice}{t('cost.perMillion')})
          </p>
        )}
        {data.outputTokens > 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            {t('cost.outputTokensShort')}: {(data.outputTokens / 1000).toFixed(1)}K {t('cost.tokens')} (${data.outputPrice}{t('cost.perMillion')})
          </p>
        )}
        <hr className="border-gray-200 dark:border-gray-700 my-1" />
        <p className="text-gray-700 dark:text-gray-300">
          {t('table.efficiency')}: <span className="font-medium">{data.efficiency?.toFixed(1)}</span>{t('common.points')}
        </p>
      </div>
    </div>
  )
}

/**
 * @brief 커스텀 레이블 렌더러 생성 함수 (내보내기 시에만 표시)
 * @param {boolean} darkMode - 다크모드 여부
 * @return {function} LabelList content 렌더러
 */
function createCustomLabel(darkMode) {
  const fillColor = darkMode ? '#d1d5db' : '#374151'
  return function CustomLabel(props) {
    const { x, y, value } = props
    return (
      <text
        x={x}
        y={y - 16}
        textAnchor="middle"
        fill={fillColor}
        fontSize={11}
        fontWeight="500"
        className="hidden"
        data-export-show="true"
      >
        {value}
      </text>
    )
  }
}

/**
 * @brief 나누어 떨어지는 적절한 Y축 범위 계산
 * @param {number} min - 데이터 최솟값
 * @param {number} max - 데이터 최댓값
 * @param {number} tickCount - 원하는 틱 개수 (기본: 5)
 * @return {Object} { min, max, interval }
 */
function getNiceRange(min, max, tickCount = 5) {
  const range = max - min
  if (range === 0) {
    // 모든 값이 동일한 경우
    return { min: Math.floor(min / 10) * 10, max: Math.ceil(max / 10) * 10 + 10, interval: 10 }
  }

  const rawInterval = range / tickCount
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)))
  const residual = rawInterval / magnitude

  let niceInterval
  if (residual <= 1.5) niceInterval = 1 * magnitude
  else if (residual <= 3) niceInterval = 2 * magnitude
  else if (residual <= 7) niceInterval = 5 * magnitude
  else niceInterval = 10 * magnitude

  const niceMin = Math.floor(min / niceInterval) * niceInterval
  const niceMax = Math.ceil(max / niceInterval) * niceInterval

  return { min: niceMin, max: niceMax, interval: niceInterval }
}

/**
 * @brief 비용 vs 성능 산점도 차트 컴포넌트
 * @param {Object} props - { data, title, height, maxScore }
 * @param {Array} props.data - getCostData() 반환 형식
 * @param {string} props.title - 차트 제목
 * @param {number} props.height - 차트 높이 (기본: 800)
 * @param {number} props.maxScore - 만점 (기본: 450)
 */
export default function CostScatterChart({
  data,
  title,
  height = 800,
  maxScore = 450
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

  // 모바일에서 높이 축소
  const chartHeight = isMobile ? 280 : height

  // 다크모드용 색상
  const axisColor = darkMode ? '#4b5563' : '#e5e7eb'
  const tickColor = darkMode ? '#9ca3af' : '#6b7280'
  const referenceLineColor = darkMode ? '#6b7280' : '#9ca3af'

  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        {t('common.noData')}
      </div>
    )
  }

  // 비용이 있는 데이터만 필터링
  const validData = data.filter(d => d.totalCost > 0)

  if (!validData.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        {t('common.noCostData')}
      </div>
    )
  }

  // X축 범위 계산
  const dataMaxCost = Math.max(...validData.map(d => d.totalCost))
  const maxCost = dataMaxCost * 1.1  // 10% 여유

  // Y축 범위 계산 (실제 데이터 기반, 나누어 떨어지는 간격)
  const dataMinScore = Math.min(...validData.map(d => d.score))
  const dataMaxScore = Math.max(...validData.map(d => d.score))
  const { min: yMin, max: yMax, interval: yInterval } = getNiceRange(dataMinScore, dataMaxScore)

  // Y축 틱 생성
  const yTicks = []
  for (let i = yMin; i <= yMax; i += yInterval) {
    yTicks.push(i)
  }

  // 중앙 기준선 (축 범위의 중앙)
  const midCost = maxCost / 2
  const midScore = (yMin + yMax) / 2

  // X축 tick 생성 (정수 간격, 마지막 제외)
  const xTickInterval = Math.ceil(maxCost / 5)  // 약 5등분
  const xTicks = []
  for (let i = 0; i <= maxCost; i += xTickInterval) {
    xTicks.push(i)
  }

  return (
    <div ref={ref} className="w-full">
      <div className="flex items-start justify-between mb-4">
        {title && (
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        )}
        <div className="flex items-start gap-2">
          <span className="hidden text-base text-gray-400 mt-8" data-export-show="true">Github/hehee9</span>
          <ExportButton onClick={() => exportImage(`${t('export.costAnalysis')}.png`)} />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          {/* 4분면 배경색 */}
          {/* 좌상: 고성능-저비용 (초록) */}
          <ReferenceArea x1={0} x2={midCost} y1={midScore} y2={yMax} fill={darkMode ? '#22c55e' : '#bbf7d0'} fillOpacity={darkMode ? 0.25 : 0.5} />
          {/* 우하: 저성능-고비용 (빨강) */}
          <ReferenceArea x1={midCost} x2={maxCost} y1={yMin} y2={midScore} fill={darkMode ? '#ef4444' : '#fecaca'} fillOpacity={darkMode ? 0.25 : 0.5} />
          <XAxis
            type="number"
            dataKey="totalCost"
            name={t('cost.testCost')}
            domain={[0, maxCost]}
            ticks={xTicks}
            tickFormatter={(v) => `$${v}`}
            tickLine={false}
            axisLine={{ stroke: axisColor }}
            tick={{ fill: tickColor }}
            label={{ value: t('cost.axisTestCost'), position: 'bottom', offset: 0, fill: tickColor }}
          />
          <YAxis
            type="number"
            dataKey="score"
            name={t('table.score')}
            domain={[yMin, yMax]}
            ticks={yTicks}
            tickLine={false}
            axisLine={{ stroke: axisColor }}
            tick={{ fill: tickColor }}
            label={{ value: t('cost.axisScore'), angle: -90, position: 'insideLeft', fill: tickColor }}
          />
          <Tooltip content={<CustomTooltip t={t} />} />
          {/* 중앙 비용 세로선 */}
          <ReferenceLine
            x={midCost}
            stroke={referenceLineColor}
            strokeWidth={1}
          />
          {/* 중앙 점수 가로선 */}
          <ReferenceLine
            y={midScore}
            stroke={referenceLineColor}
            strokeWidth={1}
          />
          <Scatter
            data={validData}
            shape={(props) => {
              const { cx, cy, payload } = props
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={7}
                  fill={getModelColor(payload.model)}
                  stroke={darkMode ? '#ffffff' : '#000000'}
                  strokeWidth={0.6}
                />
              )
            }}
          >
            <LabelList
              dataKey="model"
              content={createCustomLabel(darkMode)}
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
