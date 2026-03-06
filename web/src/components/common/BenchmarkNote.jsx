/**
 * @file BenchmarkNote.jsx
 * @brief 벤치마크 실행 조건 설명 공통 노트
 */

import { useTranslation } from 'react-i18next'

export default function BenchmarkNote({ className = 'mt-3 text-sm text-gray-500 dark:text-gray-400' }) {
  const { t } = useTranslation()

  return (
    <p className={className}>
      {t('benchmark.noExternalSearch')}
    </p>
  )
}
