/**
 * @file colorUtils.js
 * @brief 모델별 색상 관리 유틸리티
 *
 * generate_charts.py의 ChartConfig 색상 체계를 JavaScript로 포팅
 */

/**
 * @brief 브랜드별 색상 상수
 */
export const MODEL_COLORS = {
  GPT: '#EA4335',       // OpenAI - 빨간색
  Gemini: '#4285F4',    // Google - 파란색
  Claude: '#D2691E',    // Anthropic - 주황색~갈색
  Grok: '#6A4C93',      // xAI - 보라색
  DeepSeek: '#1E3A8A',  // DeepSeek - 어두운 파란색
  EXAONE: '#A50034',    // LG - 자홍색
  default: '#6B7280'    // 기타 - 회색
}

/**
 * @brief 개발사(Vendor) 정의
 * - pattern: 모델명 매칭용 정규식
 * - color: 브랜드 색상 (MODEL_COLORS 참조)
 */
export const VENDORS = [
  { id: 'openai', name: 'OpenAI', pattern: /gpt/i, color: MODEL_COLORS.GPT },
  { id: 'google', name: 'Google', pattern: /gemini/i, color: MODEL_COLORS.Gemini },
  { id: 'anthropic', name: 'Anthropic', pattern: /claude/i, color: MODEL_COLORS.Claude },
  { id: 'xai', name: 'xAI', pattern: /grok/i, color: MODEL_COLORS.Grok },
  { id: 'deepseek', name: 'DeepSeek', pattern: /deepseek/i, color: MODEL_COLORS.DeepSeek },
  { id: 'lg', name: 'LG AI Research', pattern: /exaone/i, color: MODEL_COLORS.EXAONE },
  { id: 'other', name: '기타', pattern: null, color: MODEL_COLORS.default }
]

/**
 * @brief 모델명으로 개발사 객체 반환
 * @param {string} modelName - 모델명
 * @return {Object} 개발사 객체 { id, name, pattern, color }
 */
export function getVendor(modelName) {
  for (const v of VENDORS) {
    if (v.pattern?.test(modelName)) return v
  }
  return VENDORS.find(v => v.id === 'other')
}

/**
 * @brief 모델 목록을 개발사별로 그룹화
 * @param {string[]} models - 모델명 배열
 * @return {Object} { vendorId: [모델명, ...], ... }
 */
export function groupModelsByVendor(models) {
  const groups = {}
  VENDORS.forEach(v => { groups[v.id] = [] })

  models.forEach(model => {
    const vendor = getVendor(model)
    groups[vendor.id].push(model)
  })

  // 각 그룹 내 이름 내림차순 정렬 (최신 모델 위로)
  Object.keys(groups).forEach(id => {
    groups[id].sort((a, b) => b.localeCompare(a))
  })

  return groups
}

/**
 * @brief 개발사를 모델 수 기준 내림차순으로 정렬
 * @param {Object} groupedModels - groupModelsByVendor 결과
 * @return {Array} 정렬된 개발사 객체 배열
 */
export function getSortedVendors(groupedModels) {
  return VENDORS
    .filter(v => groupedModels[v.id]?.length > 0)
    .sort((a, b) => groupedModels[b.id].length - groupedModels[a.id].length)
}

/**
 * @brief 차트용 공통 색상 상수
 */
export const CHART_COLORS = {
  common: '#34A853',      // 공통 영역 - 초록색
  elective: '#FBBC04',    // 선택 영역 - 노란색
  correct: '#22c55e',     // 정답 - 초록색
  incorrect: '#ef4444',   // 오답 - 빨간색
  perfect: '#EA4335'      // 만점 - 빨간색
}

/**
 * @brief 모델명으로 브랜드 색상 반환
 * @param {string} modelName - 모델명
 * @return {string} HEX 색상 코드
 */
export function getModelColor(modelName) {
  const name = modelName.toLowerCase()

  if (name.includes('gpt') || name.includes('gpt-')) {
    return MODEL_COLORS.GPT
  }
  if (name.includes('gemini')) {
    return MODEL_COLORS.Gemini
  }
  if (name.includes('claude')) {
    return MODEL_COLORS.Claude
  }
  if (name.includes('grok')) {
    return MODEL_COLORS.Grok
  }
  if (name.includes('deepseek')) {
    return MODEL_COLORS.DeepSeek
  }
  if (name.includes('exaone')) {
    return MODEL_COLORS.EXAONE
  }

  return MODEL_COLORS.default
}

/**
 * @brief HEX 색상을 밝게 조정
 * @param {string} hex - HEX 색상 코드 (예: '#EA4335')
 * @param {number} factor - 밝기 조정 비율 (0~1, 1이면 흰색)
 * @return {string} 조정된 HEX 색상 코드
 */
export function lightenColor(hex, factor = 0.5) {
  const hexColor = hex.replace('#', '')
  const r = parseInt(hexColor.slice(0, 2), 16)
  const g = parseInt(hexColor.slice(2, 4), 16)
  const b = parseInt(hexColor.slice(4, 6), 16)

  const newR = Math.round(r + (255 - r) * factor)
  const newG = Math.round(g + (255 - g) * factor)
  const newB = Math.round(b + (255 - b) * factor)

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

/**
 * @brief HEX 색상을 어둡게 조정
 * @param {string} hex - HEX 색상 코드
 * @param {number} factor - 어둡기 조정 비율 (0~1, 1이면 검정)
 * @return {string} 조정된 HEX 색상 코드
 */
export function darkenColor(hex, factor = 0.3) {
  const hexColor = hex.replace('#', '')
  const r = parseInt(hexColor.slice(0, 2), 16)
  const g = parseInt(hexColor.slice(2, 4), 16)
  const b = parseInt(hexColor.slice(4, 6), 16)

  const newR = Math.round(r * (1 - factor))
  const newG = Math.round(g * (1 - factor))
  const newB = Math.round(b * (1 - factor))

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

/**
 * @brief 히트맵 셀 색상 반환 (정답/오답 × 배점)
 * @param {boolean} isCorrect - 정답 여부
 * @param {number} points - 배점
 * @param {boolean} darkMode - 다크모드 여부
 * @return {string} HEX 색상 코드
 */
export function getHeatmapColor(isCorrect, points, darkMode = false) {
  if (isCorrect === undefined || isCorrect === null) {
    return darkMode ? '#374151' : '#f0f0f0'
  }

  if (isCorrect) {
    // 정답: 배점에 따라 초록색 진하기 조절
    if (points >= 3) {
      return darkMode ? '#16a34a' : '#22c55e'
    }
    return darkMode ? '#166534' : '#86efac'
  } else {
    // 오답: 배점에 따라 빨간색 진하기 조절
    if (points >= 3) {
      return darkMode ? '#dc2626' : '#ef4444'
    }
    return darkMode ? '#991b1b' : '#fca5a5'
  }
}

/**
 * @brief CSS 변수 값 가져오기
 * @param {string} varName - CSS 변수명 (예: '--color-bg-primary')
 * @return {string} CSS 변수 값
 */
export function getCSSVariable(varName) {
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}

/**
 * @brief 현재 테마가 다크모드인지 확인
 * @return {boolean} 다크모드 여부
 */
export function isDarkMode() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}
