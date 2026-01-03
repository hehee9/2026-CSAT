/**
 * @file SortOptions.jsx
 * @brief 정렬 옵션 드롭다운 컴포넌트
 */

import { useTranslation } from 'react-i18next'

/**
 * @brief 정렬 옵션 컴포넌트
 * @param {Object} props - { sortBy: string, onChange: (sortBy) => void }
 */
export default function SortOptions({ sortBy, onChange }) {
  const { t } = useTranslation()

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{t('sidebar.sort')}</h3>
      <select
        value={sortBy}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      >
        <option value="score_desc">{t('sidebar.sortOptions.scoreDesc')}</option>
        <option value="score_asc">{t('sidebar.sortOptions.scoreAsc')}</option>
        <option value="name_asc">{t('sidebar.sortOptions.nameAsc')}</option>
        <option value="name_desc">{t('sidebar.sortOptions.nameDesc')}</option>
        <option value="vendor">{t('sidebar.sortOptions.vendor')}</option>
        <option value="cost_asc">{t('sidebar.sortOptions.costAsc')}</option>
        <option value="efficiency_desc">{t('sidebar.sortOptions.efficiencyDesc')}</option>
      </select>
    </div>
  )
}
