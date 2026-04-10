/**
 * @file BenchmarkNote.jsx
 * @brief 벤치마크 실행 조건 설명 공통 노트
 */

import { useTranslation } from 'react-i18next'
import { hasPartialBenchmark, getAnyModelFlags } from '@/utils/modelMeta'

/**
 * @brief 범례용 미니 사각형 SVG
 * @param {{ type: 'noVision' | 'nonStandard' }} props
 */
function _LegendSwatch({ type }) {
  const size = 14
  const d = 3
  if (type === 'noVision') {
    return (
      <svg width={size} height={size} className="inline-block align-middle mr-1 shrink-0">
        <defs>
          <linearGradient id="ls-l" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(0,0,0,0.4)" /><stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <linearGradient id="ls-r" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(0,0,0,0.4)" /><stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <linearGradient id="ls-t" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.4)" /><stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <linearGradient id="ls-b" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(0,0,0,0.4)" /><stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <rect width={size} height={size} rx={2} fill="#888" />
        <rect x={0} y={0} width={d} height={size} fill="url(#ls-l)" />
        <rect x={size - d} y={0} width={d} height={size} fill="url(#ls-r)" />
        <rect x={0} y={0} width={size} height={d} fill="url(#ls-t)" />
        <rect x={0} y={size - d} width={size} height={d} fill="url(#ls-b)" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} className="inline-block align-middle mr-1 shrink-0">
      <defs>
        <pattern id="legend-hatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width={size} height={size} rx={2} fill="#888" />
      <rect width={size} height={size} rx={2} fill="url(#legend-hatch)" />
    </svg>
  )
}

export default function BenchmarkNote({
  className = 'mt-3 text-sm text-gray-500 dark:text-gray-400',
  modelNames = []
}) {
  const { t } = useTranslation()
  const flags = getAnyModelFlags(modelNames)

  return (
    <div className={className}>
      <p>{t('benchmark.noExternalSearch')}</p>
      {(flags.hasNoVision || flags.hasNonStandard) && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {flags.hasNoVision && (
            <span className="inline-flex items-center">
              <_LegendSwatch type="noVision" />
              {t('models.noVision')}
            </span>
          )}
          {flags.hasNonStandard && (
            <span className="inline-flex items-center">
              <_LegendSwatch type="nonStandard" />
              {t('models.nonStandard')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
