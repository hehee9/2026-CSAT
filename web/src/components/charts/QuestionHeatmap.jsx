/**
 * @file QuestionHeatmap.jsx
 * @brief 문항별 정답/오답 히트맵 컴포넌트
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getModelColor, getHeatmapColor } from '@/utils/colorUtils'
import { useTheme } from '@/hooks/useTheme'
import { getQuestionNumbers, calculateModelAccuracy } from '@/utils/heatmapTransform'
import { useExportImage } from '@/hooks/useExportImage'
import { ExportButton } from '@/components/common'

/**
 * @brief 문항별 정답률 계산
 * @param {Object} data - 히트맵 데이터
 * @param {Array<string>} models - 모델 목록
 * @param {number} questionNumber - 문항 번호
 * @return {number} 정답률 (0-100)
 */
function _calculateQuestionAccuracy(data, models, questionNumber) {
  let correct = 0
  let total = 0
  models.forEach(model => {
    const cell = data[questionNumber]?.[model]
    if (cell !== undefined) {
      total++
      if (cell.isCorrect) correct++
    }
  })
  return total > 0 ? (correct / total) * 100 : 0
}

/**
 * @brief 정답률에 따른 그라데이션 배경색 반환
 * @param {number} accuracy - 정답률 (0-100)
 * @param {boolean} darkMode - 다크모드 여부
 * @return {string} HSL 색상 문자열
 */
function _getAccuracyColor(accuracy, darkMode) {
  // 0% = 빨강(hue 0), 100% = 초록(hue 120)
  // 자연스러운 그라데이션: 빨강 → 주황 → 노랑 → 연두 → 초록
  const hue = (accuracy / 100) * 120
  const lightness = darkMode ? 40 : 70
  return `hsl(${hue}, 50%, ${lightness}%)`
}

/**
 * @brief 문항별 정답/오답 히트맵 컴포넌트
 * @param {Object} props - { data, models, title }
 * @param {Object} props.data - { questionNumber: { modelName: { isCorrect, points } } }
 * @param {Array<string>} props.models - 표시할 모델 목록
 * @param {string} props.title - 차트 제목
 */
export default function QuestionHeatmap({ data, models, title }) {
  const { t } = useTranslation()
  const { isDark: darkMode } = useTheme()
  const [showAnswerNumbers, setShowAnswerNumbers] = useState(false)
  const questions = useMemo(() => getQuestionNumbers(data), [data])
  const { ref, exportImage } = useExportImage()

  if (!data || !models?.length || !questions.length) {
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
          <button
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showAnswerNumbers
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            onClick={() => setShowAnswerNumbers(!showAnswerNumbers)}
            data-export-hide="true"
          >
            {showAnswerNumbers ? t('heatmap.showOX') : t('heatmap.showAnswer')}
          </button>
          <ExportButton onClick={() => exportImage(`${t('export.heatmap')}.png`)} />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
        <div className="min-w-max">
          {/* 헤더 행 */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="w-36 p-2 font-semibold text-sm text-gray-700 dark:text-gray-300 shrink-0">
              {t('table.model')}
            </div>
            {questions.map(q => (
              <div
                key={q}
                className="w-8 p-1 text-center text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0"
              >
                {q}
              </div>
            ))}
            <div className="w-20 p-2 text-center font-semibold text-sm text-gray-700 dark:text-gray-300 shrink-0">
              {t('heatmap.correctCount')}
            </div>
          </div>

          {/* 데이터 행 */}
          {models.map(model => {
            const accuracy = calculateModelAccuracy(data, model)
            return (
              <div
                key={model}
                className="flex items-center border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div
                  className="w-36 p-2 text-xs truncate shrink-0 text-gray-800 dark:text-gray-200"
                  style={{
                    borderLeft: `3px solid ${getModelColor(model)}`
                  }}
                  title={model}
                >
                  {model}
                </div>
                {questions.map(q => {
                  const cell = data[q]?.[model]
                  const bgColor = getHeatmapColor(cell?.isCorrect, cell?.points, darkMode)
                  const cellTitle = cell?.isCorrect === undefined
                    ? `${model} - ${t('heatmap.question')} ${q}: ${t('common.noData')}`
                    : cell?.isCorrect
                    ? `${model} - ${t('heatmap.question')} ${q}: ${t('heatmap.correct')} (${cell.points}${t('common.points')}) - ${t('heatmap.yourAnswer')}: ${cell.extractedAnswer}`
                    : `${model} - ${t('heatmap.question')} ${q}: ${t('heatmap.incorrect')} (${cell.points}${t('common.points')}) - ${t('heatmap.yourAnswer')}: ${cell.extractedAnswer}, ${t('heatmap.answer')}: ${cell.correctAnswer}`
                  return (
                    <div
                      key={q}
                      className="w-8 h-8 flex items-center justify-center text-xs shrink-0 border-r border-gray-50 dark:border-gray-700"
                      style={{ backgroundColor: bgColor }}
                      title={cellTitle}
                    >
                      {showAnswerNumbers ? (
                        // 답 번호 모드: 숫자 표시
                        <span className={`font-bold text-xs ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                          {cell?.extractedAnswer ?? '-'}
                        </span>
                      ) : (
                        // O/X 모드
                        <>
                          {cell?.isCorrect === true && (
                            <span className={`font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>○</span>
                          )}
                          {cell?.isCorrect === false && (
                            <span className={`font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>✕</span>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
                <div className="w-20 p-2 text-center text-sm font-medium shrink-0 text-gray-800 dark:text-gray-200">
                  {accuracy.correct}/{accuracy.total}
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">
                    ({accuracy.accuracy.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )
          })}

          {/* 문항별 정답률 행 */}
          <div className="flex items-center border-t-2 border-gray-300 dark:border-gray-600">
            <div className="w-36 p-2 text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0 bg-gray-100 dark:bg-gray-700">
              {t('heatmap.accuracy')}
            </div>
            {questions.map(q => {
              const qAccuracy = _calculateQuestionAccuracy(data, models, q)
              return (
                <div
                  key={q}
                  className="w-8 h-8 flex items-center justify-center text-xs shrink-0"
                  style={{ backgroundColor: _getAccuracyColor(qAccuracy, darkMode) }}
                  title={`${t('heatmap.question')} ${q} ${t('heatmap.accuracy')}: ${qAccuracy.toFixed(0)}%`}
                >
                  <span className={`font-medium text-xs ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    {qAccuracy.toFixed(0)}%
                  </span>
                </div>
              )
            })}
            <div className="w-20 shrink-0 bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: darkMode ? '#16a34a' : '#22c55e' }} />
          <span>{t('heatmap.legend.correctHigh')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: darkMode ? '#166534' : '#86efac' }} />
          <span>{t('heatmap.legend.correctLow')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: darkMode ? '#dc2626' : '#ef4444' }} />
          <span>{t('heatmap.legend.incorrectHigh')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: darkMode ? '#991b1b' : '#fca5a5' }} />
          <span>{t('heatmap.legend.incorrectLow')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: darkMode ? '#374151' : '#f0f0f0' }} />
          <span>{t('common.noData')}</span>
        </div>
      </div>
    </div>
  )
}
