/**
 * @file colorUtils.js
 * @brief 모델별 색상 관리 유틸리티
 *
 * generate_charts.py의 ChartConfig 색상 체계를 JavaScript로 포팅
 */

import { formatModelDisplayName, isPartialBenchmarkModel } from './modelMeta'

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
  Solar: '#B19CD9',     // Upstage - 연보라색
  Kimi: '#2D2D2D',      // Moonshot - 매우 어두운 회색
  GLM: '#1A73E8',       // Zhipu AI - 파란색
  Qwen: '#FF6A00',      // Alibaba - 주황색
  default: '#6B7280'    // 기타 - 회색
}

/**
 * @brief 개발사(Vendor) 정의
 * - pattern: 모델명 매칭용 정규식
 * - color: 브랜드 색상 (MODEL_COLORS 참조)
 */
export const VENDORS = [
  { id: 'openai', name: 'OpenAI', pattern: /gpt|^o\d/i, color: MODEL_COLORS.GPT },
  { id: 'google', name: 'Google', pattern: /gemini/i, color: MODEL_COLORS.Gemini },
  { id: 'anthropic', name: 'Anthropic', pattern: /claude/i, color: MODEL_COLORS.Claude },
  { id: 'xai', name: 'xAI', pattern: /grok/i, color: MODEL_COLORS.Grok },
  { id: 'deepseek', name: 'DeepSeek', pattern: /deepseek/i, color: MODEL_COLORS.DeepSeek },
  { id: 'lg', name: 'LG AI Research', pattern: /exaone/i, color: MODEL_COLORS.EXAONE },
  { id: 'upstage', name: 'Upstage', pattern: /solar/i, color: MODEL_COLORS.Solar },
  { id: 'moonshot', name: 'Moonshot', pattern: /kimi/i, color: MODEL_COLORS.Kimi },
  { id: 'zhipu', name: 'Zhipu AI', pattern: /glm/i, color: MODEL_COLORS.GLM },
  { id: 'alibaba', name: 'Alibaba', pattern: /qwen/i, color: MODEL_COLORS.Qwen },
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

  if (name.includes('gpt') || /^o\d/.test(name)) {
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
  if (name.includes('solar')) {
    return MODEL_COLORS.Solar
  }
  if (name.includes('kimi')) {
    return MODEL_COLORS.Kimi
  }
  if (name.includes('glm')) {
    return MODEL_COLORS.GLM
  }
  if (name.includes('qwen')) {
    return MODEL_COLORS.Qwen
  }

  return MODEL_COLORS.default
}

/**
 * @brief 모델명을 짧은 이름으로 변환 (규칙 기반)
 *
 * 규칙:
 * 1. '-'를 띄어쓰기로 변경 (단, 버전 번호 제외: V3.2 등)
 * 2. 'Preview, ' 제거
 * 3. K-EXAONE: '236B-A23B' 또는 '236B A23B' 삭제
 * 4. 괄호 처리:
 *    - 'Non-Thinking', 'low', 'minimal' → 괄호 전체 제거
 *    - 'Thinking', 'XXK Thinking', 'high' → 💡로 대체
 *
 * @param {string} modelName - 원본 모델명
 * @return {string} 짧은 모델명
 */
export function getShortModelName(modelName) {
  let name = formatModelDisplayName(modelName)

  // 1. K-EXAONE 특수 처리: '236B-A23B' 또는 '236B A23B' 제거
  name = name.replace(/[-\s]?236B[-\s]?A23B/gi, '')

  // 2. 'Preview, ' 제거
  name = name.replace(/Preview,?\s*/gi, '')

  // 3. 괄호 내용 처리
  const parenMatch = name.match(/\(([^)]+)\)/)
  if (parenMatch) {
    const inner = parenMatch[1].toLowerCase()
    if (inner.includes('non-thinking') || inner === 'low' || inner === 'minimal') {
      // Non-Thinking, low, minimal → 괄호 전체 제거
      name = name.replace(/\s*\([^)]+\)/, '')
    } else if (inner.includes('thinking') || inner === 'high') {
      // Thinking, XXK Thinking, high → 💡
      name = name.replace(/\s*\([^)]+\)/, ' 💡')
    }
  }

  // 4. '-'를 띄어쓰기로 (버전 번호 V3.2 등은 유지)
  // DeepSeek-V3.2 → DeepSeek V3.2, GPT-5.1 → GPT 5.1
  name = name.replace(/-(?=[A-Za-z])/g, ' ')

  // 5. 중복 공백 정리
  name = name.replace(/\s+/g, ' ').trim()

  return name
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

/**
 * @brief 개발사별 상위 모델 기본 선택 목록 계산
 * @param {string[]} models - 전체 모델명 배열
 * @param {Array} scoreData - calculateAllModelScores 결과 (총점 내림차순)
 * @return {string[]} 기본 선택된 모델명 배열
 *
 * 규칙:
 * - 일반 모델: 각 개발사별 min(floor(50%), 4개) 모델 선택 (점수 높은 순, 최소 1개)
 * - 부분 벤치마크 모델: 기본 선택에 항상 포함
 */
export function getDefaultSelectedModels(models, scoreData) {
  const visibleModels = models.filter(model => !isPartialBenchmarkModel(model))
  const partialModels = models.filter(model => isPartialBenchmarkModel(model))
  const grouped = groupModelsByVendor(visibleModels)
  const scoreMap = new Map(scoreData.map(s => [s.model, s.total]))
  const result = []

  Object.values(grouped).forEach(vendorModels => {
    if (vendorModels.length === 0) return

    // 점수 기준 내림차순 정렬
    const sorted = [...vendorModels].sort((a, b) =>
      (scoreMap.get(b) || 0) - (scoreMap.get(a) || 0)
    )

    // min(floor(50%), 4개), 최소 1개 보장
    const limit = Math.min(Math.max(1, Math.floor(vendorModels.length * 0.5)), 4)
    result.push(...sorted.slice(0, limit))
  })

  const sortedPartialModels = [...partialModels].sort((a, b) =>
    (scoreMap.get(b) || 0) - (scoreMap.get(a) || 0)
  )

  return [...result, ...sortedPartialModels]
}
