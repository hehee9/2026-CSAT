/**
 * @file BenchmarkNote.jsx
 * @brief 벤치마크 실행 조건 설명 공통 노트
 */

import { useTranslation } from 'react-i18next'
import { hasPartialBenchmark } from '@/utils/modelMeta'

export default function BenchmarkNote({
  className = 'mt-3 text-sm text-gray-500 dark:text-gray-400',
  modelNames = []
}) {
  const { t } = useTranslation()
  const showPartialNote = hasPartialBenchmark(modelNames)

  return (
    <div className={className}>
      <p>{t('benchmark.noExternalSearch')}</p>
      {showPartialNote && (
        <p className="mt-1">{t('models.partialWrongOnly')}</p>
      )}
    </div>
  )
}
