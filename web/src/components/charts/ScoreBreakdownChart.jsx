/**
 * @file ScoreBreakdownChart.jsx
 * @brief 공통+선택과목 분리 스택 차트 컴포넌트
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts'
import { CHART_COLORS } from '@/utils/colorUtils'

/**
 * @brief 커스텀 툴팁 컴포넌트
 * @param {Object} props - { active, payload }
 */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload
  const total = (data.common || 0) + (data.elective || 0)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-gray-800 mb-2">{data.model}</p>
      <div className="space-y-1 text-sm">
        <p className="text-gray-600">
          <span
            className="inline-block w-3 h-3 rounded mr-2"
            style={{ backgroundColor: CHART_COLORS.common }}
          />
          공통: <span className="font-medium">{data.common ?? 0}점</span>
          {data.commonMax && <span className="text-gray-400"> / {data.commonMax}점</span>}
        </p>
        <p className="text-gray-600">
          <span
            className="inline-block w-3 h-3 rounded mr-2"
            style={{ backgroundColor: CHART_COLORS.elective }}
          />
          선택: <span className="font-medium">{data.elective?.toFixed(1) ?? 0}점</span>
          {data.electiveMax && <span className="text-gray-400"> / {data.electiveMax}점</span>}
        </p>
        {data.electiveName && (
          <p className="text-xs text-gray-400">선택과목: {data.electiveName}</p>
        )}
        <hr className="border-gray-200 my-1" />
        <p className="text-gray-700 font-medium">
          총점: {total.toFixed(1)}점
          {data.totalMax && <span className="text-gray-400"> / {data.totalMax}점</span>}
        </p>
      </div>
    </div>
  )
}

/**
 * @brief 커스텀 범례 컴포넌트
 */
function CustomLegend() {
  return (
    <div className="flex justify-center gap-6 mt-2">
      <div className="flex items-center gap-2">
        <span
          className="w-4 h-4 rounded"
          style={{ backgroundColor: CHART_COLORS.common }}
        />
        <span className="text-sm text-gray-600">공통</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="w-4 h-4 rounded"
          style={{ backgroundColor: CHART_COLORS.elective }}
        />
        <span className="text-sm text-gray-600">선택</span>
      </div>
    </div>
  )
}

/**
 * @brief 점수 분리 스택 차트 컴포넌트
 * @param {Object} props - { data, maxScore, title, height }
 * @param {Array} props.data - [{ model, common, elective, commonMax?, electiveMax?, totalMax?, electiveName? }]
 * @param {number} props.maxScore - 차트 X축 최대값
 * @param {string} props.title - 차트 제목
 * @param {number} props.height - 차트 높이 (기본: 400)
 */
export default function ScoreBreakdownChart({
  data,
  maxScore,
  title,
  height = 400
}) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        데이터가 없습니다
      </div>
    )
  }

  // 최대 점수 계산
  const computedMaxScore = maxScore ?? Math.max(
    ...data.map(d => (d.common || 0) + (d.elective || 0))
  )

  // 동적 높이 계산
  const dynamicHeight = Math.max(height, data.length * 40 + 80)

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={dynamicHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 100, bottom: 30 }}
        >
          <XAxis
            type="number"
            domain={[0, computedMaxScore]}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            type="category"
            dataKey="model"
            tickLine={false}
            axisLine={false}
            width={90}
            tick={{ fontSize: 12, fill: '#374151' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
          <Legend content={<CustomLegend />} />
          <ReferenceLine
            x={computedMaxScore}
            stroke={CHART_COLORS.perfect}
            strokeDasharray="3 3"
            strokeWidth={2}
          />
          <Bar
            dataKey="common"
            stackId="score"
            fill={CHART_COLORS.common}
            radius={[0, 0, 0, 0]}
            barSize={24}
            name="공통"
          />
          <Bar
            dataKey="elective"
            stackId="score"
            fill={CHART_COLORS.elective}
            radius={[0, 4, 4, 0]}
            barSize={24}
            name="선택"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
