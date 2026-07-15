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
  ReferenceArea
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { getModelColor } from '@/utils/colorUtils'
import { useTheme } from '@/hooks/useTheme'
import { useExportImage, README_EXPORT_WIDTH } from '@/hooks/useExportImage'
import { BenchmarkNote, ExportButton } from '@/components/common'
import { formatModelDisplayName } from '@/utils/modelMeta'

const COST_POINT_RADIUS = 7
const EXPORT_LABEL_GAP = 6
const EXPORT_LABEL_BOUNDARY_PADDING = 4
const EXPORT_LABEL_COLLISION_PADDING = 2
const EXPORT_LABEL_POINT_PADDING = 3
const EXPORT_LABEL_DEFAULT_ANGLE = -90
const EXPORT_LABEL_COARSE_STEP = 2
const EXPORT_LABEL_FINE_STEP = 0.1
const EXPORT_LABEL_FINE_RANGE = 2
const EXPORT_LABEL_MAX_PASSES = 3

/**
 * @brief 각도를 0~360도 범위로 정규화
 * @param {number} angle - 각도
 * @return {number} 정규화된 각도
 */
function _normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360
}

/**
 * @brief 두 각도 사이의 최소 차이 계산
 * @param {number} first - 첫 번째 각도
 * @param {number} second - 두 번째 각도
 * @return {number} 0~180도 범위의 각도 차이
 */
function _getAngleDifference(first, second) {
  const difference = Math.abs(_normalizeAngle(first) - _normalizeAngle(second))
  return Math.min(difference, 360 - difference)
}

/**
 * @brief 기본 위쪽 위치에서 떨어진 최소 각도 계산
 * @param {number} angle - 검사할 각도
 * @return {number} 0~180도 범위의 각도 차이
 */
function _getDefaultAngleDistance(angle) {
  return _getAngleDifference(angle, EXPORT_LABEL_DEFAULT_ANGLE)
}

/**
 * @brief 두 사각형의 겹치는 면적 계산
 * @param {Object} first - 첫 번째 사각형
 * @param {Object} second - 두 번째 사각형
 * @param {number} padding - 첫 번째 사각형에 적용할 안전 여백
 * @return {number} 겹치는 면적
 */
function _getBoxOverlapArea(first, second, padding = 0) {
  const overlapWidth = Math.max(
    0,
    Math.min(first.right + padding, second.right) - Math.max(first.left - padding, second.left)
  )
  const overlapHeight = Math.max(
    0,
    Math.min(first.bottom + padding, second.bottom) - Math.max(first.top - padding, second.top)
  )
  return overlapWidth * overlapHeight
}

/**
 * @brief 차트 경계를 벗어난 라벨 면적 계산
 * @param {Object} box - 라벨 사각형
 * @param {Object} bounds - 차트 경계
 * @return {number} 경계 밖 면적
 */
function _getBoundaryOverflowArea(box, bounds) {
  const boxArea = Math.max(0, box.right - box.left) * Math.max(0, box.bottom - box.top)
  const insideWidth = Math.max(0, Math.min(box.right, bounds.right) - Math.max(box.left, bounds.left))
  const insideHeight = Math.max(0, Math.min(box.bottom, bounds.bottom) - Math.max(box.top, bounds.top))
  return Math.max(0, boxArea - insideWidth * insideHeight)
}

/**
 * @brief 원 중심과 글자 사각형 사이의 최단거리 계산
 * @param {number} distance - 원 중심에서 글자 중심까지의 거리
 * @param {number} cosine - 배치 각도의 코사인
 * @param {number} sine - 배치 각도의 사인
 * @param {number} halfWidth - 글자 너비의 절반
 * @param {number} halfHeight - 글자 높이의 절반
 * @return {number} 원 중심과 글자 경계 사이의 최단거리
 */
function _getPointToLabelDistance(distance, cosine, sine, halfWidth, halfHeight) {
  const outsideX = Math.max(Math.abs(cosine * distance) - halfWidth, 0)
  const outsideY = Math.max(Math.abs(sine * distance) - halfHeight, 0)
  return Math.hypot(outsideX, outsideY)
}

/**
 * @brief 고정 경계 간격을 유지하는 라벨 중심거리 계산
 * @param {number} angle - 배치 각도
 * @param {number} halfWidth - 글자 너비의 절반
 * @param {number} halfHeight - 글자 높이의 절반
 * @return {number} 원 중심과 글자 중심 사이의 거리
 */
function _getFixedGapCenterDistance(angle, halfWidth, halfHeight) {
  const radians = angle * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const targetDistance = COST_POINT_RADIUS + EXPORT_LABEL_GAP
  let low = 0
  let high = halfWidth + halfHeight + targetDistance

  while (_getPointToLabelDistance(high, cosine, sine, halfWidth, halfHeight) < targetDistance) {
    high *= 2
  }

  for (let iteration = 0; iteration < 24; iteration += 1) {
    const middle = (low + high) / 2
    const distance = _getPointToLabelDistance(middle, cosine, sine, halfWidth, halfHeight)
    if (distance < targetDistance) low = middle
    else high = middle
  }

  return high
}

/**
 * @brief 지정한 각도의 라벨 좌표와 경계 상자 계산
 * @param {Object} record - 라벨 측정 정보
 * @param {number} angle - 배치 각도
 * @return {Object} 라벨 배치 정보
 */
function _getLabelPlacement(record, angle) {
  const halfWidth = record.width / 2
  const halfHeight = record.height / 2
  const radians = angle * Math.PI / 180
  const distance = _getFixedGapCenterDistance(angle, halfWidth, halfHeight)
  const centerX = record.pointX + Math.cos(radians) * distance
  const centerY = record.pointY + Math.sin(radians) * distance

  return {
    angle: _normalizeAngle(angle),
    x: centerX - record.anchorOffsetX,
    y: centerY - record.anchorOffsetY,
    box: {
      left: centerX - halfWidth,
      right: centerX + halfWidth,
      top: centerY - halfHeight,
      bottom: centerY + halfHeight
    }
  }
}

/**
 * @brief 라벨 후보의 경계·충돌·각도 점수 계산
 * @param {Object} record - 현재 라벨
 * @param {Object} placement - 검사할 배치
 * @param {Object[]} records - 전체 라벨 목록
 * @param {Object} bounds - 차트 경계
 * @return {Object} 후보 비교 점수
 */
function _getPlacementScore(record, placement, records, bounds) {
  let collisionOverlap = 0

  records.forEach(other => {
    if (other !== record) {
      collisionOverlap += _getBoxOverlapArea(
        placement.box,
        other.placement.box,
        EXPORT_LABEL_COLLISION_PADDING
      )

      const pointRadius = COST_POINT_RADIUS + EXPORT_LABEL_POINT_PADDING
      collisionOverlap += _getBoxOverlapArea(placement.box, {
        left: other.pointX - pointRadius,
        right: other.pointX + pointRadius,
        top: other.pointY - pointRadius,
        bottom: other.pointY + pointRadius
      })
    }
  })

  return {
    boundaryOverflow: _getBoundaryOverflowArea(placement.box, bounds),
    collisionOverlap,
    angleDistance: _getDefaultAngleDistance(placement.angle),
    angleOrder: placement.angle
  }
}

/**
 * @brief 두 라벨 배치 점수를 우선순위대로 비교
 * @param {Object} first - 첫 번째 점수
 * @param {Object} second - 두 번째 점수
 * @return {number} 첫 번째 점수가 좋으면 음수
 */
function _comparePlacementScores(first, second) {
  const keys = ['boundaryOverflow', 'collisionOverlap', 'angleDistance', 'angleOrder']
  for (const key of keys) {
    const difference = first[key] - second[key]
    if (Math.abs(difference) > 0.0001) return difference
  }
  return 0
}

/**
 * @brief 전체 360도에서 가장 좋은 라벨 각도 탐색
 * @param {Object} record - 현재 라벨
 * @param {Object[]} records - 전체 라벨 목록
 * @param {Object} bounds - 차트 경계
 * @return {Object} 선택된 라벨 배치
 */
function _findBestLabelPlacement(record, records, bounds) {
  let bestPlacement = null
  let bestScore = null

  for (let angle = 0; angle < 360; angle += EXPORT_LABEL_COARSE_STEP) {
    const placement = _getLabelPlacement(record, angle)
    const score = _getPlacementScore(record, placement, records, bounds)
    if (!bestScore || _comparePlacementScores(score, bestScore) < 0) {
      bestPlacement = placement
      bestScore = score
    }
  }

  const coarseAngle = bestPlacement.angle
  const fineSteps = Math.round(EXPORT_LABEL_FINE_RANGE / EXPORT_LABEL_FINE_STEP)
  for (let step = -fineSteps; step <= fineSteps; step += 1) {
    const angle = coarseAngle + step * EXPORT_LABEL_FINE_STEP
    const placement = _getLabelPlacement(record, angle)
    const score = _getPlacementScore(record, placement, records, bounds)
    if (_comparePlacementScores(score, bestScore) < 0) {
      bestPlacement = placement
      bestScore = score
    }
  }

  return bestPlacement
}

/**
 * @brief 라벨 주변의 다른 모델 밀도 계산
 * @param {Object} record - 현재 라벨
 * @param {Object[]} records - 전체 라벨 목록
 * @return {number} 주변 모델 수
 */
function _getLabelDensity(record, records) {
  return records.reduce((density, other) => {
    if (other === record) return density
    const distance = Math.hypot(record.pointX - other.pointX, record.pointY - other.pointY)
    const threshold = Math.max(record.width, other.width) / 2 + 48
    return density + (distance < threshold ? 1 : 0)
  }, 0)
}

/**
 * @brief 비용 산점도 라벨을 고정 간격으로 360도 재배치
 * @param {HTMLElement} rootElement - 이미지 내보내기 루트
 * @return {function|undefined} 원래 좌표 복원 함수
 */
function _prepareCostScatterLabels(rootElement) {
  const labelElements = Array.from(rootElement.querySelectorAll('[data-cost-scatter-label="true"]'))
  if (!labelElements.length) return undefined

  const svg = labelElements[0].closest('svg')
  const viewBox = svg?.viewBox?.baseVal
  const width = viewBox?.width || svg?.width?.baseVal?.value
  const height = viewBox?.height || svg?.height?.baseVal?.value
  if (!svg || !width || !height) return undefined

  const bounds = {
    left: (viewBox?.x || 0) + EXPORT_LABEL_BOUNDARY_PADDING,
    right: (viewBox?.x || 0) + width - EXPORT_LABEL_BOUNDARY_PADDING,
    top: (viewBox?.y || 0) + EXPORT_LABEL_BOUNDARY_PADDING,
    bottom: (viewBox?.y || 0) + height - EXPORT_LABEL_BOUNDARY_PADDING
  }

  const originalDisplays = labelElements.map(element => element.style.display)
  labelElements.forEach(element => {
    element.style.display = 'block'
  })

  let records = []
  const restoreLabels = () => {
    records.forEach((record, index) => {
      record.element.setAttribute('x', record.originalX)
      record.element.setAttribute('y', record.originalY)
      record.element.style.display = originalDisplays[index]
    })
    labelElements.slice(records.length).forEach((element, index) => {
      element.style.display = originalDisplays[records.length + index]
    })
  }

  try {
    records = labelElements.map((element, index) => {
      const originalX = element.getAttribute('x')
      const originalY = element.getAttribute('y')
      const pointX = Number(element.dataset.pointX)
      const pointY = Number(element.dataset.pointY)
      const anchorX = Number(originalX)
      const anchorY = Number(originalY)
      const box = element.getBBox()

      return {
        element,
        index,
        originalX,
        originalY,
        pointX,
        pointY,
        width: box.width,
        height: box.height,
        anchorOffsetX: box.x + box.width / 2 - anchorX,
        anchorOffsetY: box.y + box.height / 2 - anchorY,
        placement: null
      }
    })

    const hasInvalidRecord = records.some(record => !(
      Number.isFinite(record.pointX) &&
      Number.isFinite(record.pointY) &&
      Number.isFinite(record.width) && record.width > 0 &&
      Number.isFinite(record.height) && record.height > 0
    ))
    if (hasInvalidRecord) {
      restoreLabels()
      return undefined
    }

    records.forEach(record => {
      record.placement = _getLabelPlacement(record, EXPORT_LABEL_DEFAULT_ANGLE)
    })

    const optimizationOrder = [...records].sort((first, second) => {
      const densityDifference = _getLabelDensity(second, records) - _getLabelDensity(first, records)
      return densityDifference || first.index - second.index
    })

    for (let pass = 0; pass < EXPORT_LABEL_MAX_PASSES; pass += 1) {
      let changed = false
      optimizationOrder.forEach(record => {
        const placement = _findBestLabelPlacement(record, records, bounds)
        if (_getAngleDifference(placement.angle, record.placement.angle) > 0.05) {
          changed = true
        }
        record.placement = placement
      })
      if (!changed) break
    }

    records.forEach(record => {
      record.element.setAttribute('x', String(record.placement.x))
      record.element.setAttribute('y', String(record.placement.y))
    })

    return restoreLabels
  } catch (error) {
    restoreLabels()
    throw error
  }
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
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{formatModelDisplayName(data.model)}</p>
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
  const { ref, exportImage, isExporting } = useExportImage({
    exportWidth: README_EXPORT_WIDTH,
    prepareExport: _prepareCostScatterLabels
  })

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

  // Y축 범위 계산 (최대값은 만점 기준, 최소값은 데이터 기반)
  const dataMinScore = Math.min(...validData.map(d => d.score))
  const yMax = maxScore
  // 최소값을 깔끔한 간격으로 계산
  const { min: yMin, interval: yInterval } = getNiceRange(dataMinScore, maxScore)

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
          <ExportButton
            onClick={() => exportImage(`${t('export.costAnalysis')}.png`)}
            exportKey="cost-scatter"
          />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ScatterChart
          key={darkMode ? 'dark' : 'light'}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          {/* 다크모드 차트 영역 배경 (gray-800~900 중간: #182130) */}
          {darkMode && (
            <ReferenceArea x1={0} x2={maxCost} y1={yMin} y2={yMax} fill="#182130" fillOpacity={1} />
          )}
          {/* 4분면 배경색 (다크모드: 투명도 0.4로 대비 강화) */}
          {/* 좌상: 고성능-저비용 (초록) */}
          <ReferenceArea x1={0} x2={midCost} y1={midScore} y2={yMax} fill={darkMode ? '#22c55e' : '#bbf7d0'} fillOpacity={darkMode ? 0.4 : 0.5} />
          {/* 우하: 저성능-고비용 (빨강) */}
          <ReferenceArea x1={midCost} x2={maxCost} y1={yMin} y2={midScore} fill={darkMode ? '#ef4444' : '#fecaca'} fillOpacity={darkMode ? 0.4 : 0.5} />
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
            isAnimationActive={!isExporting}
            shape={(props) => {
              const { cx, cy, payload } = props
              const label = formatModelDisplayName(payload.model)
              return (
                <g>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={7}
                    fill={getModelColor(payload.model)}
                    stroke={darkMode ? '#ffffff' : '#000000'}
                    strokeWidth={0.6}
                  />
                  <text
                    x={cx}
                    y={cy - 16}
                    textAnchor="middle"
                    fill={darkMode ? '#d1d5db' : '#374151'}
                    fontSize={11}
                    fontWeight="500"
                    className="hidden"
                    data-export-show="true"
                    data-cost-scatter-label="true"
                    data-point-x={cx}
                    data-point-y={cy}
                  >
                    {label}
                  </text>
                </g>
              )
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <BenchmarkNote modelNames={validData.map(item => item.model)} />
    </div>
  )
}
