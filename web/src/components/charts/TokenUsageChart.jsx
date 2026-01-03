/**
 * @file TokenUsageChart.jsx
 * @brief 모델별 토큰 사용량 스택 바 차트
 */

import { useMemo, useState, useCallback, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
  CartesianGrid
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { getModelColor, getShortModelName } from '@/utils/colorUtils'
import { useTheme } from '@/hooks/useTheme'
import { useExportImage } from '@/hooks/useExportImage'
import { ExportButton } from '@/components/common'

/**
 * @brief 깔끔한 틱 간격 계산 (100K, 200K, 500K, 1M 등)
 * @param {number} max - 데이터 최댓값
 * @param {number} tickCount - 원하는 틱 개수 (기본: 4)
 * @return {Object} { max, interval, ticks }
 */
function _getNiceTokenTicks(max, tickCount = 4) {
  if (max <= 0) return { max: 500000, interval: 100000, ticks: [0, 100000, 200000, 300000, 400000, 500000] }

  const rawInterval = max / tickCount
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)))
  const residual = rawInterval / magnitude

  // 깔끔한 간격: 1, 2, 5, 10 배수
  let niceInterval
  if (residual <= 1.5) niceInterval = 1 * magnitude
  else if (residual <= 3) niceInterval = 2 * magnitude
  else if (residual <= 7) niceInterval = 5 * magnitude
  else niceInterval = 10 * magnitude

  const niceMax = Math.ceil(max / niceInterval) * niceInterval

  const ticks = []
  for (let i = 0; i <= niceMax; i += niceInterval) {
    ticks.push(i)
  }

  return { max: niceMax, interval: niceInterval, ticks }
}

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
          {t('cost.inputTokensShort')}: <span className="font-medium">{data.inputTokens.toLocaleString()}</span> {t('cost.tokens')}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          {t('cost.outputTokensShort')}: <span className="font-medium">{data.outputTokens.toLocaleString()}</span> {t('cost.tokens')}
        </p>
        <hr className="border-gray-200 dark:border-gray-700 my-1" />
        <p className="text-gray-700 dark:text-gray-300">
          {t('token.total')}: <span className="font-medium">{data.total.toLocaleString()}</span> {t('cost.tokens')}
        </p>
      </div>
    </div>
  )
}

/**
 * @brief 레이블 모드 옵션 (번역 키)
 */
const LABEL_MODES = [
  { id: 'total', labelKey: 'token.total' },
  { id: 'split', labelKey: 'token.inputOutput' },
  { id: 'none', labelKey: 'token.hidden' }
]

/**
 * @brief 커스텀 레이블 렌더러
 * @param {Object} props - Recharts LabelList props
 * @param {string} mode - 'total' | 'split' | 'none'
 * @param {boolean} darkMode - 다크모드 여부
 */
function CustomLabel({ x, y, width, index, mode, chartData, darkMode }) {
  if (mode === 'none' || index === undefined || !chartData[index]) return null

  const entry = chartData[index]
  let label

  if (mode === 'total') {
    const totalK = Math.round(entry.total / 1000)
    label = `${totalK.toLocaleString()}K`
  } else {
    const inputK = Math.round(entry.inputTokens / 1000)
    const outputK = Math.round(entry.outputTokens / 1000)
    label = `${inputK.toLocaleString()}K + ${outputK.toLocaleString()}K`
  }

  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      fill={darkMode ? '#d1d5db' : '#374151'}
      fontSize={11}
      fontWeight="500"
    >
      {label}
    </text>
  )
}

/**
 * @brief 모델별 토큰 사용량 스택 바 차트 컴포넌트
 * @param {Object} props - { data, models, subjectFilter, height, title }
 * @param {Object} props.data - tokenUsage 객체 ({ modelName: { total_input_tokens, total_output_tokens, sections, ... } })
 * @param {Array} props.models - 표시할 모델 목록 (null이면 전체)
 * @param {Array} props.subjectFilter - 과목 필터 배열 (빈 배열이면 전체)
 * @param {number} props.height - 차트 높이 (기본: 600)
 * @param {string} props.title - 차트 제목
 */
export default function TokenUsageChart({
  data,
  models = null,
  subjectFilter = [],
  height = 600,
  title
}) {
  const { t } = useTranslation()
  const { isDark: darkMode } = useTheme()
  const { ref, exportImage } = useExportImage()
  const [labelMode, setLabelMode] = useState('total')

  // 모바일 감지
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 데이터 변환 및 정렬
  const chartData = useMemo(() => {
    if (!data || typeof data !== 'object') return []

    return Object.entries(data)
      .filter(([model]) => !models || models.includes(model)) // 모델 필터링
      .map(([model, usage]) => {
        let inputTokens, outputTokens, total

        if (subjectFilter.length > 0) {
          // 과목 필터 활성화: sections 데이터 필수
          if (!usage.sections) return null // sections 데이터 없으면 제외

          // 선택된 과목들의 토큰만 합산
          inputTokens = 0
          outputTokens = 0

          subjectFilter.forEach(subject => {
            // "국어" → "국어-공통", "국어-화작" 등 모두 포함
            Object.keys(usage.sections).forEach(sectionKey => {
              if (sectionKey.startsWith(subject + '-') || sectionKey === subject) {
                const sectionData = usage.sections[sectionKey]
                inputTokens += sectionData.input_tokens || 0
                outputTokens += sectionData.output_tokens || 0
              }
            })
          })

          total = inputTokens + outputTokens
          if (total === 0) return null // 해당 과목 데이터 없음
        } else {
          // 전체 토큰 (필터 없음)
          inputTokens = usage.total_input_tokens || 0
          outputTokens = usage.total_output_tokens || 0
          total = usage.total_tokens || 0
        }

        return { model, inputTokens, outputTokens, total }
      })
      .filter(Boolean)
      .sort((a, b) => a.total - b.total) // 총량 오름차순
  }, [data, models, subjectFilter])

  // Y축 최대값 및 틱 계산
  const maxTotal = chartData.length ? Math.max(...chartData.map(d => d.total)) : 0
  const yMax = Math.ceil(maxTotal / 500000) * 500000 || 500000 // 500K 단위로 올림

  // Y축 틱 생성 (900K 간격)
  const yTicks = useMemo(() => {
    const ticks = []
    for (let i = 0; i <= yMax; i += 900000) {
      ticks.push(i)
    }
    return ticks
  }, [yMax])

  // 레이블 렌더러 메모이제이션
  const renderLabel = useCallback((props) => (
    <CustomLabel {...props} mode={labelMode} chartData={chartData} darkMode={darkMode} />
  ), [labelMode, chartData, darkMode])

  // 다크모드용 색상
  const axisColor = darkMode ? '#4b5563' : '#e5e7eb'
  const tickColor = darkMode ? '#9ca3af' : '#6b7280'
  const xTickColor = darkMode ? '#d1d5db' : '#374151'
  const cursorColor = darkMode ? 'rgba(55, 65, 81, 0.5)' : '#f3f4f6'

  // 데이터 없음 처리 (모든 훅 호출 후)
  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        {t('common.noData')}
      </div>
    )
  }

  // 모바일: 가로 막대 차트 (ScoreBarChart 스타일)
  if (isMobile) {
    const mobileHeight = Math.max(300, chartData.length * 45 + 80)

    // 모바일용 X축 틱 계산 (동적)
    const { max: xMax, ticks: xTicks } = _getNiceTokenTicks(maxTotal)

    return (
      <div ref={ref} className="w-full">
        <div className="flex items-start justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
          )}
          <ExportButton onClick={() => exportImage(`${t('export.tokenUsage')}.png`)} />
        </div>
        <ResponsiveContainer width="100%" height={mobileHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 50, left: 5, bottom: 10 }}
          >
            <XAxis
              type="number"
              domain={[0, xMax]}
              ticks={xTicks}
              tickFormatter={(v) => `${(v / 1000).toLocaleString()}K`}
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={{ stroke: axisColor }}
            />
            <YAxis
              type="category"
              dataKey="model"
              width={100}
              tickLine={false}
              axisLine={false}
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="end"
                  fontSize={10}
                  fill={xTickColor}
                >
                  {getShortModelName(payload.value)}
                </text>
              )}
            />
            <CartesianGrid
              horizontal={false}
              vertical={true}
              stroke={axisColor}
              strokeDasharray="3 3"
            />
            <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: cursorColor }} />
            {/* 출력 토큰 (좌측, 진한 색) */}
            <Bar dataKey="outputTokens" stackId="tokens" name={t('cost.outputTokensShort')} isAnimationActive={false} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`output-${index}`}
                  fill={getModelColor(entry.model)}
                  fillOpacity={0.9}
                />
              ))}
            </Bar>
            {/* 입력 토큰 (우측, 연한 색) */}
            <Bar dataKey="inputTokens" stackId="tokens" name={t('cost.inputTokensShort')} isAnimationActive={false} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`input-${index}`}
                  fill={getModelColor(entry.model)}
                  fillOpacity={0.5}
                />
              ))}
              <LabelList
                dataKey="total"
                position="right"
                formatter={(v) => `${Math.round(v / 1000).toLocaleString()}K`}
                style={{ fontSize: 9, fill: xTickColor }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // 데스크톱: 기존 차트
  return (
    <div ref={ref} className="w-full">
      <div className="flex items-start justify-between mb-2">
        {title && (
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        )}
        <div className="flex items-start gap-2">
          <span className="hidden text-base text-gray-400 mt-8" data-export-show="true">Github/hehee9</span>
          <ExportButton onClick={() => exportImage(`${t('export.tokenUsage')}.png`)} />
        </div>
      </div>
      <div className="flex items-center gap-1 mb-4" data-export-hide="true">
        {LABEL_MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => setLabelMode(mode.id)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              labelMode === mode.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t(mode.labelKey)}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 30, right: 30, left: 20, bottom: 100 }}
        >
          <XAxis
            dataKey="model"
            angle={-45}
            textAnchor="end"
            interval={0}
            tick={{ fontSize: 11, fill: xTickColor }}
            tickLine={false}
            axisLine={{ stroke: axisColor }}
            height={100}
          />
          <YAxis
            tickFormatter={(v) => `${(v / 1000).toLocaleString()}K`}
            tick={{ fontSize: 11, fill: tickColor }}
            tickLine={false}
            axisLine={{ stroke: axisColor }}
            domain={[0, yMax]}
            ticks={yTicks}
          />
          <CartesianGrid
            horizontal={true}
            vertical={false}
            stroke={axisColor}
            strokeDasharray="3 3"
          />
          <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: cursorColor }} />
          {/* 출력 토큰 (하단, 진한 색) */}
          <Bar dataKey="outputTokens" stackId="tokens" name={t('cost.outputTokensShort')} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell
                key={`output-${index}`}
                fill={getModelColor(entry.model)}
                fillOpacity={0.9}
              />
            ))}
          </Bar>
          {/* 입력 토큰 (상단, 연한 색) */}
          <Bar dataKey="inputTokens" stackId="tokens" name={t('cost.inputTokensShort')} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell
                key={`input-${index}`}
                fill={getModelColor(entry.model)}
                fillOpacity={0.5}
              />
            ))}
            <LabelList
              dataKey="total"
              position="top"
              content={renderLabel}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
