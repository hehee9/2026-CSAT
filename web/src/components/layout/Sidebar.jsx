/**
 * @file Sidebar.jsx
 * @brief 대시보드 사이드바 레이아웃 컴포넌트
 */

import { useTranslation } from 'react-i18next'
import { SubjectFilter, ModelFilter, SortOptions } from '@/components/filters'

/**
 * @brief 사이드바 컴포넌트
 * @param {Object} props - { filters, onFilterChange, hoveredModel, onModelHover }
 */
export default function Sidebar({ filters, onFilterChange, hoveredModel, onModelHover }) {
  const { t } = useTranslation()

  return (
    <aside className="w-64 bg-gray-50 dark:bg-gray-800 p-4 min-h-screen border-r border-gray-200 dark:border-gray-700 shrink-0">
      {/* 표시 옵션 */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{t('sidebar.displayOptions')}</h3>
        <button
          className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
            filters.showDetail
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          onClick={() => onFilterChange({ ...filters, showDetail: !filters.showDetail })}
        >
          {filters.showDetail ? t('sidebar.hideDetail') : t('sidebar.showDetail')}
        </button>
      </div>

      <SubjectFilter
        selected={filters.subjects}
        onChange={(subjects) => onFilterChange({ ...filters, subjects })}
        showDetail={filters.showDetail}
      />
      <ModelFilter
        selected={filters.models}
        onChange={(models) => onFilterChange({ ...filters, models })}
        hoveredModel={hoveredModel}
        onModelHover={onModelHover}
      />
      <SortOptions
        sortBy={filters.sortBy}
        onChange={(sortBy) => onFilterChange({ ...filters, sortBy })}
      />
    </aside>
  )
}
