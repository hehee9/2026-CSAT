/**
 * @file ModelCompareChart.jsx
 * @brief 모델 비교 레이더 차트 컴포넌트
 */

import { useMemo } from 'react'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { getModelColor } from '@/utils/colorUtils'
import { useTheme } from '@/hooks/useTheme'
import { useExportImage } from '@/hooks/useExportImage'
import { ExportButton } from '@/components/common'

/**
 * @brief 과목별 정규화 기준
 */
const SUBJECTS = [
  { nameKey: 'subjects.korean', key: 'korean', maxScore: 100 },
  { nameKey: 'subjects.math', key: 'math', maxScore: 100 },
  { nameKey: 'subjects.english', key: 'english', maxScore: 100 },
  { nameKey: 'subjects.history', key: 'history', maxScore: 50 },
  { nameKey: 'subjects.exploration', key: 'exploration', maxScore: 100 }
]

/**
 * @brief 커스텀 툴팁 컴포넌트
 * @param {Object} props - { active, payload, label, t }
 */
function CustomTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-medium">{entry.value?.toFixed(1)}{t('common.points')}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

/**
 * @brief 모델 비교 레이더 차트 컴포넌트
 * @param {Object} props - { data, selectedModels, allScores, title, height, hoveredModel, onModelHover }
 * @param {Array} props.data - [{ subject, model1: score, model2: score, ... }]
 * @param {Array<string>} props.selectedModels - 비교할 모델명 배열
 * @param {Array} props.allScores - 전체 모델 점수 데이터 (호버된 모델 표시용)
 * @param {string} props.title - 차트 제목
 * @param {number} props.height - 차트 높이 (기본: 400)
 * @param {string} props.hoveredModel - 현재 호버된 모델명
 * @param {Function} props.onModelHover - 모델 호버 콜백
 */
export default function ModelCompareChart({
  data,
  selectedModels,
  allScores,
  title,
  height = 400,
  hoveredModel,
  onModelHover
}) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const { ref, exportImage } = useExportImage()

  // 다크모드용 색상
  const gridColor = isDark ? '#4b5563' : '#e5e7eb'
  const tickColor = isDark ? '#d1d5db' : '#374151'
  const radiusTickColor = isDark ? '#9ca3af' : '#9ca3af'

  // 기본 차트 데이터 (빈 오각형용 - 그리드 렌더링을 위한 더미 값 포함)
  const baseData = useMemo(() => {
    return SUBJECTS.map(({ nameKey }) => ({ subject: t(nameKey), _grid: 100 }))
  }, [t])

  // 호버된 모델이 선택되지 않은 경우, 데이터에 추가
  const chartData = useMemo(() => {
    // 기본 데이터 사용 (선택된 모델이 없을 때)
    const sourceData = data?.length ? data : baseData

    if (!hoveredModel || selectedModels?.includes(hoveredModel)) return sourceData

    // 호버된 모델의 점수 찾기
    const modelScore = allScores?.find(s => s.model === hoveredModel)
    if (!modelScore) return sourceData

    // 기존 데이터에 호버된 모델 점수 추가
    return sourceData.map((row, idx) => {
      const { key, maxScore } = SUBJECTS[idx]
      const rawScore = modelScore[key] ?? 0
      return {
        ...row,
        [hoveredModel]: (rawScore / maxScore) * 100
      }
    })
  }, [data, baseData, hoveredModel, selectedModels, allScores])

  // 호버된 모델이 선택되지 않은 경우 표시할지 여부
  const showHoveredModel = hoveredModel && !selectedModels?.includes(hoveredModel)

  if (!allScores?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        {t('common.noData')}
      </div>
    )
  }

  return (
    <div ref={ref} className="w-full">
      <div className="flex items-start justify-between mb-4">
        {title && (
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        )}
        <div className="flex items-start gap-2">
          <span className="hidden text-base text-gray-400 mt-8" data-export-show="true">Github/hehee9</span>
          <ExportButton onClick={() => exportImage(`${t('export.heatmap')}.png`)} />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 12, fill: tickColor }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: radiusTickColor }}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip t={t} />} />
          {/* 그리드 렌더링용 투명 Radar (선택된 모델이 없을 때도 오각형 표시) */}
          <Radar
            dataKey="_grid"
            stroke="transparent"
            fill="transparent"
            fillOpacity={0}
            isAnimationActive={false}
          />
          {/* 선택되지 않은 호버 모델 (반투명 표시) */}
          {showHoveredModel && (
            <Radar
              key={`hover-${hoveredModel}`}
              name={hoveredModel}
              dataKey={hoveredModel}
              stroke={getModelColor(hoveredModel)}
              fill={getModelColor(hoveredModel)}
              fillOpacity={0.3}
              strokeWidth={2}
              strokeOpacity={0.6}
              strokeDasharray="5 5"
              animationDuration={300}
            />
          )}
          {/* 선택된 모델들 */}
          {selectedModels.map((model) => (
            <Radar
              key={model}
              name={model}
              dataKey={model}
              stroke={getModelColor(model)}
              fill={getModelColor(model)}
              fillOpacity={
                !hoveredModel ? 0.2 :
                hoveredModel === model ? 0.5 : 0.05
              }
              strokeWidth={hoveredModel === model ? 3 : 2}
              strokeOpacity={hoveredModel && hoveredModel !== model ? 0.3 : 1}
              animationDuration={500}
            />
          ))}
          <Legend
            content={({ payload }) => (
              <div className="flex flex-wrap justify-center gap-3 mt-2 min-h-[24px]">
                {payload.filter(entry => entry.dataKey !== '_grid').map((entry) => (
                  <span
                    key={entry.value}
                    className={`cursor-pointer transition-opacity text-sm ${
                      hoveredModel && hoveredModel !== entry.value ? 'opacity-40' : ''
                    }`}
                    style={{ color: entry.color }}
                    onMouseEnter={() => onModelHover?.(entry.value)}
                    onMouseLeave={() => onModelHover?.(null)}
                  >
                    ● {entry.value}
                  </span>
                ))}
              </div>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
