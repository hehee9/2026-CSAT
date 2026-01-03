/**
 * @file choiceTransform.js
 * @brief heatmapData를 선지 선택률 차트용으로 변환하는 유틸리티
 */

/**
 * @brief 서술형 문항 번호 (선지 선택률에서 제외)
 */
const SHORT_ANSWER_QUESTIONS = {
  수학: {
    공통: [16, 17, 18, 19, 20, 21, 22],
    확통: [29, 30],
    미적: [29, 30],
    기하: [29, 30]
  }
}

/**
 * @brief 해당 문항이 서술형인지 확인
 * @param {string} subject - 과목명
 * @param {string} section - 섹션명
 * @param {number} questionNumber - 문항 번호
 * @return {boolean} 서술형 여부
 */
function _isShortAnswer(subject, section, questionNumber) {
  const subjectQuestions = SHORT_ANSWER_QUESTIONS[subject]
  if (!subjectQuestions) return false

  const sectionQuestions = subjectQuestions[section]
  if (!sectionQuestions) return false

  return sectionQuestions.includes(questionNumber)
}

/**
 * @brief heatmapData를 선지 선택률 차트용으로 변환
 * @param {Object} heatmapData - { questionNumber: { modelName: { extractedAnswer, correctAnswer, ... } } }
 * @param {Array<string>} models - 모델 목록
 * @param {string} subject - 과목명 (서술형 필터링용)
 * @param {string} section - 섹션명 (서술형 필터링용)
 * @return {Array} 문항별 선지 선택률 배열
 */
export function transformToChoiceData(heatmapData, models, subject = '', section = '') {
  const questions = Object.keys(heatmapData)
    .map(Number)
    .sort((a, b) => a - b)
    // 서술형 문항 제외
    .filter(qNum => !_isShortAnswer(subject, section, qNum))

  return questions.map(qNum => {
    const choices = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let validModels = 0
    let correctAnswer = null

    models.forEach(model => {
      const cell = heatmapData[qNum]?.[model]
      if (cell && cell.extractedAnswer) {
        choices[cell.extractedAnswer]++
        validModels++
        if (!correctAnswer) correctAnswer = cell.correctAnswer
      }
    })

    const result = { question: qNum, correctAnswer, totalModels: validModels }
    for (let i = 1; i <= 5; i++) {
      result[`choice${i}`] = choices[i]
      result[`choice${i}Pct`] = validModels > 0 ? (choices[i] / validModels) * 100 : 0
    }
    return result
  })
}
