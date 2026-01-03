/**
 * @file CostTable.jsx
 * @brief 모델별 비용 정보 테이블
 */

import { useState, useMemo, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { getModelColor } from '@/utils/colorUtils'
import { useExportImage } from '@/hooks/useExportImage'
import { ExportButton } from '@/components/common'

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
 * @brief 비용 테이블 컴포넌트
 * @param {Object} props - { data, title }
 * @param {Array} props.data - getCostData() 결과
 * @param {string} props.title - 테이블 제목
 */
export default function CostTable({ data, title }) {
  const { t } = useTranslation()
  const [sortConfig, setSortConfig] = useState({
    key: 'efficiency',
    direction: 'desc'
  })
  const [showHiddenModels, setShowHiddenModels] = useState(false)
  const { ref, exportImage } = useExportImage()

  const sortedData = useMemo(() => {
    if (!data?.length) return []
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? 0
      const bVal = b[sortConfig.key] ?? 0
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig])

  /** @brief 토큰 정보 유무로 모델 분리 */
  const { withTokens, withoutTokens } = useMemo(() => {
    const withTokens = sortedData.filter(row => row.inputTokens > 0 || row.outputTokens > 0)
    const withoutTokens = sortedData.filter(row => row.inputTokens <= 0 && row.outputTokens <= 0)
    return { withTokens, withoutTokens }
  }, [sortedData])

  function handleSort(key) {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        {t('common.noCostData')}
      </div>
    )
  }

  const columns = [
    { key: 'model', label: t('table.model'), align: 'left' },
    { key: 'inputPrice', label: t('table.inputPrice'), align: 'right' },
    { key: 'outputPrice', label: t('table.outputPrice'), align: 'right' },
    { key: 'inputTokens', label: t('table.inputTokens'), align: 'right' },
    { key: 'outputTokens', label: t('table.outputTokens'), align: 'right' },
    { key: 'totalCost', label: t('table.totalCost'), align: 'right' },
    { key: 'score', label: t('table.score'), align: 'right' },
    { key: 'efficiency', label: t('table.efficiency'), align: 'right', bold: true }
  ]

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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.bold ? 'font-bold' : ''}`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon columnKey={col.key} sortConfig={sortConfig} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 토큰 정보 있는 모델 (항상 표시) */}
            {withTokens.map(row => (
              <tr
                key={row.model}
                className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: getModelColor(row.model) }}
                  />
                  {row.model}
                </td>
                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                  ${row.inputPrice?.toFixed(2) ?? '-'}
                </td>
                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                  ${row.outputPrice?.toFixed(2) ?? '-'}
                </td>
                <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-500">
                  {row.inputTokens > 0
                    ? `${(row.inputTokens / 1000).toFixed(1)}K`
                    : '-'}
                </td>
                <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-500">
                  {row.outputTokens > 0
                    ? `${(row.outputTokens / 1000).toFixed(1)}K`
                    : '-'}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-gray-200">
                  {row.totalCost > 0
                    ? `$${row.totalCost.toFixed(4)}`
                    : '-'}
                </td>
                <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">
                  {row.score?.toFixed(1) ?? '-'}
                </td>
                <td className="px-3 py-2 text-right font-bold text-blue-600 dark:text-blue-400">
                  {row.efficiency > 0
                    ? row.efficiency.toFixed(1)
                    : '-'}
                </td>
              </tr>
            ))}

            {/* 토큰 정보 없는 모델 (접기/펼치기) */}
            {withoutTokens.length > 0 && (
              <Fragment>
                <tr
                  className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => setShowHiddenModels(prev => !prev)}
                >
                  <td colSpan={8} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="mr-2">{showHiddenModels ? '▼' : '▶'}</span>
                    {t('cost.noTokenInfo')} ({withoutTokens.length})
                  </td>
                </tr>
                {showHiddenModels && withoutTokens.map(row => (
                  <tr
                    key={row.model}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-gray-50/50 dark:bg-gray-800/50"
                  >
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getModelColor(row.model) }}
                      />
                      {row.model}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                      ${row.inputPrice?.toFixed(2) ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                      ${row.outputPrice?.toFixed(2) ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-500">-</td>
                    <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-500">-</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-gray-200">-</td>
                    <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">
                      {row.score?.toFixed(1) ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-gray-400 dark:text-gray-500">
                      -
                    </td>
                  </tr>
                ))}
              </Fragment>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        * {t('cost.efficiencyFormula')}
      </p>
    </div>
  )
}
