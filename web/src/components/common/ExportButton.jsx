/**
 * @file ExportButton.jsx
 * @brief 이미지 내보내기 버튼 컴포넌트
 */

import { useTranslation } from 'react-i18next'

/**
 * @brief 이미지 내보내기 버튼
 * @param {Object} props - { onClick, className }
 */
export default function ExportButton({ onClick, className = '' }) {
  const { t } = useTranslation()

  return (
    <button
      onClick={onClick}
      className={`p-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700
                  border border-gray-300 dark:border-gray-600 rounded-lg
                  hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500
                  hover:text-gray-700 dark:hover:text-gray-200
                  active:bg-gray-100 dark:active:bg-gray-500 transition-colors ${className}`}
      title={t('sidebar.exportImage', 'Export as image')}
      data-export-hide="true"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
        <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={2} />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 15l-5-5L5 21"
        />
      </svg>
    </button>
  )
}
