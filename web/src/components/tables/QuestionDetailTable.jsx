/**
 * @file QuestionDetailTable.jsx
 * @brief 문항별 상세 정보 테이블
 */

import { useMemo } from 'react'
import { getModelColor } from '@/utils/colorUtils'

/**
 * @brief 문항별 상세 테이블 컴포넌트
 * @param {Object} props - { data, models, title }
 * @param {Object} props.data - { questionNumber: { modelName: { isCorrect, points, extractedAnswer } } }
 * @param {Array<string>} props.models - 표시할 모델 목록
 * @param {string} props.title - 테이블 제목
 */
export default function QuestionDetailTable({ data, models, title }) {
  const questions = useMemo(() => {
    return Object.keys(data)
      .map(Number)
      .sort((a, b) => a - b)
  }, [data])

  // 정답 정보 추출 (첫 번째 모델의 correctAnswer 사용)
  const getCorrectAnswer = (qNum) => {
    const firstModel = Object.keys(data[qNum] || {})[0]
    return data[qNum]?.[firstModel]?.correctAnswer
  }

  const getPoints = (qNum) => {
    const firstModel = Object.keys(data[qNum] || {})[0]
    return data[qNum]?.[firstModel]?.points
  }

  if (!data || !models?.length || !questions.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">
                번호
              </th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700">
                정답
              </th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700">
                배점
              </th>
              {models.map(model => (
                <th
                  key={model}
                  className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap"
                  style={{ borderBottom: `2px solid ${getModelColor(model)}` }}
                >
                  <span className="text-xs" title={model}>
                    {model.length > 15 ? `${model.slice(0, 12)}...` : model}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map(qNum => {
              const correctAnswer = getCorrectAnswer(qNum)
              const points = getPoints(qNum)

              return (
                <tr key={qNum} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-center font-medium sticky left-0 bg-white z-10">
                    {qNum}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-blue-600">
                    {correctAnswer ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600">
                    {points ?? '-'}점
                  </td>
                  {models.map(model => {
                    const cell = data[qNum]?.[model]
                    const answer = cell?.extractedAnswer

                    let bgColor = 'bg-gray-100'
                    let textColor = 'text-gray-400'

                    if (cell?.isCorrect === true) {
                      bgColor = points >= 3 ? 'bg-green-200' : 'bg-green-100'
                      textColor = 'text-green-800'
                    } else if (cell?.isCorrect === false) {
                      bgColor = points >= 3 ? 'bg-red-200' : 'bg-red-100'
                      textColor = 'text-red-800'
                    }

                    return (
                      <td
                        key={model}
                        className={`px-2 py-2 text-center ${bgColor} ${textColor}`}
                        title={`${model}: ${answer ?? '없음'} (${cell?.isCorrect ? '정답' : '오답'})`}
                      >
                        {answer ?? '-'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 범례 */}
      <div className="flex gap-4 mt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-200" />
          <span>정답 (3점+)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-100" />
          <span>정답 (2점)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-200" />
          <span>오답 (3점+)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-100" />
          <span>오답 (2점)</span>
        </div>
      </div>
    </div>
  )
}
