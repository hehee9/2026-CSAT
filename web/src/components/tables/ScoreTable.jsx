/**
 * @file ScoreTable.jsx
 * @brief 모델별 점수 테이블 (정렬 가능, 세부 점수 토글)
 */

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getModelColor } from '@/utils/colorUtils'
import { useExportImage } from '@/hooks/useExportImage'
import { ExportButton } from '@/components/common'

/** @brief 과목별 만점 기준 */
const MAX_SCORES = {
  korean: 100,
  math: 100,
  english: 100,
  history: 50,
  exploration: 100,
  total: 450,
  koreanCommon: 76,
  koreanElective: 24,
  mathCommon: 74,
  mathElective: 26,
  explorationSubject: 50
}

/**
 * @brief 정렬 아이콘 컴포넌트
 */
function SortIcon({ columnKey, sortConfig }) {
  if (sortConfig.key !== columnKey) {
    return <span className="text-gray-300 dark:text-gray-600 ml-1">↕</span>
  }
  return (
    <span className="ml-1">
      {sortConfig.direction === 'desc' ? '↓' : '↑'}
    </span>
  )
}

/**
 * @brief 점수 셀 컴포넌트 (만점 강조)
 */
function ScoreCell({ score, maxScore, decimals = 1 }) {
  if (score == null) return <span>-</span>
  const isPerfect = score >= maxScore
  const displayScore = Number.isInteger(score) ? score : score.toFixed(decimals)
  return (
    <span className={isPerfect ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
      {displayScore}
    </span>
  )
}

/**
 * @brief 정렬 키에 해당하는 값 추출
 */
function _getSortValue(row, key) {
  // 기본 필드
  if (row[key] !== undefined) return row[key]

  // 세부 점수 필드
  const kd = row.koreanDetail || {}
  const md = row.mathDetail || {}
  const ed = row.explorationDetail || {}

  switch (key) {
    case 'koreanCommon': return kd.common ?? 0
    case 'koreanHwajak': return kd.electives?.[0]?.score ?? 0
    case 'koreanUnmae': return kd.electives?.[1]?.score ?? 0
    case 'mathCommon': return md.common ?? 0
    case 'mathHwakton': return md.electives?.[0]?.score ?? 0
    case 'mathMijeok': return md.electives?.[1]?.score ?? 0
    case 'mathGiha': return md.electives?.[2]?.score ?? 0
    case 'expPhysics': return ed.subjects?.[0]?.score ?? 0
    case 'expChemistry': return ed.subjects?.[1]?.score ?? 0
    case 'expBiology': return ed.subjects?.[2]?.score ?? 0
    case 'expSociety': return ed.subjects?.[3]?.score ?? 0
    default: return 0
  }
}

/**
 * @brief 점수 테이블 컴포넌트
 * @param {Object} props - { data, onRowClick, title, showDetail, onToggleDetail, maxScore, hoveredModel, onModelHover }
 * @param {Array} props.data - calculateAllModelScores 결과
 * @param {boolean} props.showDetail - 세부 점수 표시 여부
 * @param {function} props.onToggleDetail - 세부 점수 토글 콜백
 * @param {number} props.maxScore - 동적 만점 (필터에 따라 변동)
 * @param {string} props.hoveredModel - 현재 호버된 모델명
 * @param {function} props.onModelHover - 모델 호버 콜백
 */
export default function ScoreTable({ data, onRowClick, title, showDetail = false, onToggleDetail, maxScore = 450, hoveredModel, onModelHover }) {
  const { t } = useTranslation()
  const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' })
  const { ref, exportImage } = useExportImage()

  const sortedData = useMemo(() => {
    if (!data?.length) return []
    return [...data].sort((a, b) => {
      const aVal = _getSortValue(a, sortConfig.key)
      const bVal = _getSortValue(b, sortConfig.key)
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig])

  function handleSort(key) {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  if (!data?.length) {
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
          {onToggleDetail && (
            <button
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showDetail
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              onClick={onToggleDetail}
              data-export-hide="true"
            >
              {showDetail ? t('table.hideDetail') : t('table.showDetail')}
            </button>
          )}
          <ExportButton onClick={() => exportImage(`${t('charts.scoreTable')}.png`)} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('model')}
              >
                {t('table.model')} <SortIcon columnKey="model" sortConfig={sortConfig} />
              </th>

              {/* 국어 */}
              <th
                className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('korean')}
              >
                {t('table.korean')} <SortIcon columnKey="korean" sortConfig={sortConfig} />
              </th>
              {showDetail && (
                <>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500" onClick={() => handleSort('koreanCommon')}>
                    {t('subjects.common')} <SortIcon columnKey="koreanCommon" sortConfig={sortConfig} />
                  </th>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500" onClick={() => handleSort('koreanHwajak')}>
                    {t('subjects.hwajak')} <SortIcon columnKey="koreanHwajak" sortConfig={sortConfig} />
                  </th>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500" onClick={() => handleSort('koreanUnmae')}>
                    {t('subjects.unmae')} <SortIcon columnKey="koreanUnmae" sortConfig={sortConfig} />
                  </th>
                </>
              )}

              {/* 수학 */}
              <th
                className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('math')}
              >
                {t('table.math')} <SortIcon columnKey="math" sortConfig={sortConfig} />
              </th>
              {showDetail && (
                <>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500" onClick={() => handleSort('mathCommon')}>
                    {t('subjects.common')} <SortIcon columnKey="mathCommon" sortConfig={sortConfig} />
                  </th>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500" onClick={() => handleSort('mathHwakton')}>
                    {t('subjects.hwakton')} <SortIcon columnKey="mathHwakton" sortConfig={sortConfig} />
                  </th>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500" onClick={() => handleSort('mathMijeok')}>
                    {t('subjects.mijeok')} <SortIcon columnKey="mathMijeok" sortConfig={sortConfig} />
                  </th>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500" onClick={() => handleSort('mathGiha')}>
                    {t('subjects.giha')} <SortIcon columnKey="mathGiha" sortConfig={sortConfig} />
                  </th>
                </>
              )}

              {/* 영어, 한국사 */}
              <th
                className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('english')}
              >
                {t('table.english')} <SortIcon columnKey="english" sortConfig={sortConfig} />
              </th>
              <th
                className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('history')}
              >
                {t('table.history')} <SortIcon columnKey="history" sortConfig={sortConfig} />
              </th>

              {/* 탐구 */}
              <th
                className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('exploration')}
              >
                {t('table.exploration')} <SortIcon columnKey="exploration" sortConfig={sortConfig} />
              </th>
              {showDetail && (
                <>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500" onClick={() => handleSort('expPhysics')}>
                    {t('subjects.physics1')} <SortIcon columnKey="expPhysics" sortConfig={sortConfig} />
                  </th>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500" onClick={() => handleSort('expChemistry')}>
                    {t('subjects.chemistry1')} <SortIcon columnKey="expChemistry" sortConfig={sortConfig} />
                  </th>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500" onClick={() => handleSort('expBiology')}>
                    {t('subjects.biology1')} <SortIcon columnKey="expBiology" sortConfig={sortConfig} />
                  </th>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500" onClick={() => handleSort('expSociety')}>
                    {t('subjects.society')} <SortIcon columnKey="expSociety" sortConfig={sortConfig} />
                  </th>
                </>
              )}

              {/* 총점 */}
              <th
                className="px-3 py-2 text-right font-bold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('total')}
              >
                {t('table.total')} <SortIcon columnKey="total" sortConfig={sortConfig} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map(row => {
              const kd = row.koreanDetail || {}
              const md = row.mathDetail || {}
              const ed = row.explorationDetail || {}
              const isHovered = hoveredModel === row.model

              return (
                <tr
                  key={row.model}
                  className={`border-t border-gray-100 dark:border-gray-700 transition-colors ${
                    isHovered
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row.model)}
                  onMouseEnter={() => onModelHover?.(row.model)}
                  onMouseLeave={() => onModelHover?.(null)}
                >
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                    <span
                      className="inline-block w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: getModelColor(row.model) }}
                    />
                    {row.model}
                  </td>

                  {/* 국어 */}
                  <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">
                    <ScoreCell score={row.korean} maxScore={MAX_SCORES.korean} />
                  </td>
                  {showDetail && (
                    <>
                      <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                        <ScoreCell score={kd.common} maxScore={MAX_SCORES.koreanCommon} decimals={0} />
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                        <ScoreCell score={kd.electives?.[0]?.score} maxScore={MAX_SCORES.koreanElective} decimals={0} />
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                        <ScoreCell score={kd.electives?.[1]?.score} maxScore={MAX_SCORES.koreanElective} decimals={0} />
                      </td>
                    </>
                  )}

                  {/* 수학 */}
                  <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">
                    <ScoreCell score={row.math} maxScore={MAX_SCORES.math} />
                  </td>
                  {showDetail && (
                    <>
                      <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                        <ScoreCell score={md.common} maxScore={MAX_SCORES.mathCommon} decimals={0} />
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                        <ScoreCell score={md.electives?.[0]?.score} maxScore={MAX_SCORES.mathElective} decimals={0} />
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                        <ScoreCell score={md.electives?.[1]?.score} maxScore={MAX_SCORES.mathElective} decimals={0} />
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                        <ScoreCell score={md.electives?.[2]?.score} maxScore={MAX_SCORES.mathElective} decimals={0} />
                      </td>
                    </>
                  )}

                  {/* 영어, 한국사 */}
                  <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">
                    <ScoreCell score={row.english} maxScore={MAX_SCORES.english} decimals={0} />
                  </td>
                  <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">
                    <ScoreCell score={row.history} maxScore={MAX_SCORES.history} decimals={0} />
                  </td>

                  {/* 탐구 */}
                  <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">
                    <ScoreCell score={row.exploration} maxScore={MAX_SCORES.exploration} />
                  </td>
                  {showDetail && (
                    <>
                      <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                        <ScoreCell score={ed.subjects?.[0]?.score} maxScore={MAX_SCORES.explorationSubject} decimals={0} />
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                        <ScoreCell score={ed.subjects?.[1]?.score} maxScore={MAX_SCORES.explorationSubject} decimals={0} />
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                        <ScoreCell score={ed.subjects?.[2]?.score} maxScore={MAX_SCORES.explorationSubject} decimals={0} />
                      </td>
                      <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                        <ScoreCell score={ed.subjects?.[3]?.score} maxScore={MAX_SCORES.explorationSubject} decimals={0} />
                      </td>
                    </>
                  )}

                  {/* 총점 */}
                  <td className="px-3 py-2 text-right font-bold text-gray-800 dark:text-gray-200">
                    <ScoreCell score={row.total} maxScore={maxScore} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
