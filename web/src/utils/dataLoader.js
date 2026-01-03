/**
 * @file dataLoader.js
 * @brief all_results.json 데이터 로드 및 파싱 유틸리티
 */

/**
 * @brief all_results.json 데이터를 fetch로 로드
 * @return {Promise<Array>} 파싱된 JSON 배열
 * @throws {Error} 데이터 로드 실패 시
 */
export async function loadAllResults() {
  const basePath = import.meta.env.BASE_URL || '/'
  const response = await fetch(`${basePath}all_results.json`)
  if (!response.ok) {
    throw new Error(`데이터 로드 실패: ${response.status}`)
  }
  return response.json()
}

/**
 * @brief 데이터에서 고유 값들을 추출
 * @param {Array} data - all_results.json 데이터 배열
 * @return {Object} { subjects, sections, models }
 */
export function extractUniqueValues(data) {
  const subjects = [...new Set(data.map(d => d.subject))]
  const models = [...new Set(data.map(d => d.model_name))]

  // 과목별 섹션 맵 생성
  const sections = {}
  subjects.forEach(subj => {
    sections[subj] = [...new Set(
      data.filter(d => d.subject === subj).map(d => d.section)
    )]
  })

  return { subjects, sections, models }
}

/**
 * @brief 특정 모델의 특정 과목/섹션 데이터 조회
 * @param {Array} data - all_results.json 데이터 배열
 * @param {string} modelName - 모델명
 * @param {string} subject - 과목명
 * @param {string} section - 섹션명 (선택)
 * @return {Object|null} 해당 데이터 또는 null
 */
export function getModelSubjectData(data, modelName, subject, section = null) {
  return data.find(d =>
    d.model_name === modelName &&
    d.subject === subject &&
    (section === null || d.section === section)
  ) || null
}

/**
 * @brief 특정 모델의 모든 데이터 조회
 * @param {Array} data - all_results.json 데이터 배열
 * @param {string} modelName - 모델명
 * @return {Array} 해당 모델의 모든 데이터
 */
export function getModelData(data, modelName) {
  return data.filter(d => d.model_name === modelName)
}

/**
 * @brief token_usage.json 데이터를 fetch로 로드
 * @return {Promise<Object>} 모델별 토큰 사용량 객체
 */
export async function loadTokenUsage() {
  const basePath = import.meta.env.BASE_URL || '/'
  try {
    const response = await fetch(`${basePath}token_usage.json`)
    if (!response.ok) {
      console.warn('토큰 사용량 데이터 없음')
      return {}
    }
    const data = await response.json()
    return data.models || {}
  } catch {
    console.warn('토큰 사용량 로드 실패')
    return {}
  }
}
