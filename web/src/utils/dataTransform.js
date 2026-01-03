/**
 * @file dataTransform.js
 * @brief 데이터 변환 및 점수 계산 유틸리티
 *
 * 점수 계산 방식 (450점 만점):
 * - 국어: 공통(76점) + 선택과목(화작/언매) 평균(24점)
 * - 수학: 공통(74점) + 선택과목(확통/미적/기하) 평균(26점)
 * - 영어: 전체 점수 (100점)
 * - 한국사: 전체 점수 (50점)
 * - 탐구: 4과목 평균 × 2 (각 50점, 환산 100점)
 */

import { getModelData } from './dataLoader'

/**
 * @brief 과목별 만점 (필터용)
 */
export const SUBJECT_MAX_SCORES = {
  '국어': 100,
  '수학': 100,
  '영어': 100,
  '한국사': 50,
  '탐구': 100
}

/**
 * @brief 과목명 → 점수 필드명 매핑
 */
const SUBJECT_TO_FIELD = {
  '국어': 'korean',
  '수학': 'math',
  '영어': 'english',
  '한국사': 'history',
  '탐구': 'exploration'
}

/**
 * @brief 세부 과목 → 만점 매핑
 * - 국어/수학 선택과목: 공통 + 선택 = 100점
 * - 탐구 개별과목: 50점 × 2 = 100점
 */
const ELECTIVE_MAX_SCORES = {
  '국어-화작': 100,
  '국어-언매': 100,
  '수학-확통': 100,
  '수학-미적': 100,
  '수학-기하': 100,
  '탐구-물리1': 100,
  '탐구-화학1': 100,
  '탐구-생명1': 100,
  '탐구-사문': 100
}

/**
 * @brief 세부 과목 이름 매핑 (필터명 → 데이터 내 이름)
 */
const ELECTIVE_NAME_MAP = {
  '사문': '사회문화'
}

/**
 * @brief 필터 정규화 (복수 세부과목 → 상위과목 통합)
 * - 같은 상위 과목의 세부가 2개 이상 → 상위 과목으로 통합
 * - 세부 1개만 → 세부 과목 유지
 * @param {Array} subjectFilter - 선택된 과목 배열
 * @return {Array} 정규화된 배열
 */
function _normalizeSubjectFilter(subjectFilter) {
  if (!subjectFilter || subjectFilter.length === 0) {
    return []
  }

  // 상위 과목별 세부 과목 수집
  const parentToChildren = {}
  const parentSubjects = new Set()

  subjectFilter.forEach(subject => {
    if (subject.includes('-')) {
      const [parent, child] = subject.split('-')
      if (!parentToChildren[parent]) {
        parentToChildren[parent] = []
      }
      parentToChildren[parent].push(child)
    } else {
      parentSubjects.add(subject)
    }
  })

  const result = []

  // 상위 과목 추가
  parentSubjects.forEach(parent => result.push(parent))

  // 세부 과목 처리: 같은 상위의 세부가 2개 이상이면 상위로 통합
  Object.entries(parentToChildren).forEach(([parent, children]) => {
    if (parentSubjects.has(parent)) {
      // 이미 상위 과목이 선택됨 → 세부 무시
      return
    }
    if (children.length >= 2) {
      // 복수 세부 선택 → 상위 과목으로 통합
      result.push(parent)
    } else {
      // 단일 세부 선택 → 세부 과목 유지
      result.push(`${parent}-${children[0]}`)
    }
  })

  return result
}

/**
 * @brief 세부 과목 점수 계산
 * @param {Object} scoreObj - calculateOverallScore 결과
 * @param {string} elective - 세부 과목명 (예: '국어-언매')
 * @return {number} 점수
 */
function _getElectiveScore(scoreObj, elective) {
  const [parent, child] = elective.split('-')
  const childName = ELECTIVE_NAME_MAP[child] || child

  if (parent === '국어') {
    const detail = scoreObj.koreanDetail
    const electiveScore = detail.electives.find(e => e.name === childName)?.score || 0
    return detail.common + electiveScore
  }

  if (parent === '수학') {
    const detail = scoreObj.mathDetail
    const electiveScore = detail.electives.find(e => e.name === childName)?.score || 0
    return detail.common + electiveScore
  }

  if (parent === '탐구') {
    const detail = scoreObj.explorationDetail
    const subjectScore = detail.subjects.find(s => s.name === childName)?.score || 0
    return subjectScore * 2  // 2과목 선택 환산
  }

  return 0
}

/**
 * @brief 과목 필터에 따른 만점 계산 (복수 세부과목 지원)
 * @param {Array} subjectFilter - 선택된 과목 배열 (빈 배열이면 전체)
 * @return {number} 만점
 */
export function getMaxScore(subjectFilter = []) {
  if (!subjectFilter || subjectFilter.length === 0) {
    return 450 // 전체 만점
  }

  // 상위 과목과 세부 과목 분리
  const parents = subjectFilter.filter(s => !s.includes('-'))
  const childrenByParent = {}

  subjectFilter.forEach(s => {
    if (s.includes('-')) {
      const [parent] = s.split('-')
      if (!parents.includes(parent)) {
        if (!childrenByParent[parent]) childrenByParent[parent] = []
        childrenByParent[parent].push(s)
      }
    }
  })

  // 상위 과목 만점 합산
  let sum = parents.reduce((s, p) => s + (SUBJECT_MAX_SCORES[p] || 0), 0)

  // 세부 과목 그룹 처리
  Object.keys(childrenByParent).forEach(parent => {
    if (parent === '탐구') {
      // 탐구: 1개=50점, 2개+=100점
      const count = childrenByParent[parent].length
      sum += count === 1 ? 50 : 100
    } else {
      // 국어, 수학 등: 상위 과목 만점
      sum += SUBJECT_MAX_SCORES[parent] || 0
    }
  })

  return sum
}

/**
 * @brief 과목 필터에 따른 총점 계산 (복수 세부과목 지원)
 * @param {Object} scoreObj - calculateOverallScore 결과 객체
 * @param {Array} subjectFilter - 선택된 과목 배열 (빈 배열이면 전체)
 * @return {number} 필터된 총점
 */
export function getFilteredTotal(scoreObj, subjectFilter = []) {
  if (!subjectFilter || subjectFilter.length === 0) {
    return scoreObj.total
  }

  let sum = 0
  const processedParents = new Set()

  // 상위 과목과 세부 과목 분리
  const parents = subjectFilter.filter(s => !s.includes('-'))
  const childrenByParent = {}

  subjectFilter.forEach(s => {
    if (s.includes('-')) {
      const [parent, child] = s.split('-')
      if (!childrenByParent[parent]) childrenByParent[parent] = []
      childrenByParent[parent].push(child)
    }
  })

  // 상위 과목 처리
  parents.forEach(parent => {
    const field = SUBJECT_TO_FIELD[parent]
    sum += scoreObj[field] || 0
    processedParents.add(parent)
  })

  // 세부 과목 그룹 처리 (상위가 이미 처리되지 않은 경우만)
  Object.entries(childrenByParent).forEach(([parent, children]) => {
    if (processedParents.has(parent)) return

    if (parent === '국어' || parent === '수학') {
      // 공통 + 선택한 세부들 평균
      const detail = parent === '국어' ? scoreObj.koreanDetail : scoreObj.mathDetail
      const electiveSum = children.reduce((s, c) => {
        const name = ELECTIVE_NAME_MAP[c] || c
        return s + (detail.electives.find(e => e.name === name)?.score || 0)
      }, 0)
      sum += detail.common + (electiveSum / children.length)
    } else if (parent === '탐구') {
      // 탐구: 1개=원점수, 2개+=평균×2
      const detail = scoreObj.explorationDetail
      const subjectSum = children.reduce((s, c) => {
        const name = ELECTIVE_NAME_MAP[c] || c
        return s + (detail.subjects.find(sub => sub.name === name)?.score || 0)
      }, 0)
      if (children.length === 1) {
        sum += subjectSum  // 1개: 원점수
      } else {
        sum += (subjectSum / children.length) * 2  // 2개+: 평균×2
      }
    }
  })

  return sum
}

/**
 * @brief 특정 과목/섹션의 점수 조회
 * @param {Array} modelData - 특정 모델의 데이터 배열
 * @param {string} subject - 과목명
 * @param {string} section - 섹션명
 * @return {number} 점수 (없으면 0)
 */
function _getScore(modelData, subject, section) {
  const item = modelData.find(d => d.subject === subject && d.section === section)
  return item?.score ?? 0
}

/**
 * @brief 국어/수학 점수 계산 (공통 + 선택과목 평균)
 * @param {Array} modelData - 특정 모델의 데이터 배열
 * @param {string} subject - 과목명 ('국어' 또는 '수학')
 * @return {Object} { common, electives, electiveAvg, total }
 */
function _calculateSubjectScore(modelData, subject) {
  const common = _getScore(modelData, subject, '공통')

  // 선택과목 목록
  const electiveNames = subject === '국어'
    ? ['화작', '언매']
    : ['확통', '미적', '기하']

  const electives = electiveNames.map(sect => ({
    name: sect,
    score: _getScore(modelData, subject, sect)
  }))

  // 선택과목 평균 (데이터가 있는 것만)
  const validElectives = electives.filter(e => e.score > 0)
  const electiveAvg = validElectives.length > 0
    ? validElectives.reduce((sum, e) => sum + e.score, 0) / validElectives.length
    : 0

  return {
    common,
    electives,
    electiveAvg,
    total: common + electiveAvg
  }
}

/**
 * @brief 탐구 점수 계산 (4과목 평균 × 2)
 * @param {Array} modelData - 특정 모델의 데이터 배열
 * @return {Object} { subjects, average, total }
 */
function _calculateExplorationScore(modelData) {
  const explorationSubjects = ['물리1', '화학1', '생명1', '사회문화']

  const subjects = explorationSubjects.map(subj => ({
    name: subj,
    score: _getScore(modelData, subj, '탐구')
  }))

  // 데이터가 있는 과목만으로 평균 계산
  const validSubjects = subjects.filter(s => s.score > 0)
  const average = validSubjects.length > 0
    ? validSubjects.reduce((sum, s) => sum + s.score, 0) / validSubjects.length
    : 0

  return {
    subjects,
    average,
    total: average * 2  // 2과목 선택 환산
  }
}

/**
 * @brief 모델별 종합 점수 계산 (450점 만점)
 * @param {Array} data - all_results.json 전체 데이터
 * @param {string} modelName - 모델명
 * @return {Object} 과목별 점수 및 총점
 */
export function calculateOverallScore(data, modelName) {
  const modelData = getModelData(data, modelName)

  const korean = _calculateSubjectScore(modelData, '국어')
  const math = _calculateSubjectScore(modelData, '수학')
  const english = _getScore(modelData, '영어', '영어')
  const history = _getScore(modelData, '한국사', '한국사')
  const exploration = _calculateExplorationScore(modelData)

  const total = korean.total + math.total + english + history + exploration.total

  return {
    model: modelName,
    korean: korean.total,
    koreanDetail: korean,
    math: math.total,
    mathDetail: math,
    english,
    history,
    exploration: exploration.total,
    explorationDetail: exploration,
    total
  }
}

/**
 * @brief 전체 모델의 종합 점수 계산
 * @param {Array} data - all_results.json 전체 데이터
 * @param {Array} models - 모델명 배열
 * @param {Array} subjectFilter - 과목 필터 (빈 배열이면 전체)
 * @return {Array} 모델별 종합 점수 배열 (총점 내림차순)
 */
export function calculateAllModelScores(data, models, subjectFilter = []) {
  return models
    .map(model => {
      const scores = calculateOverallScore(data, model)
      // 필터가 있으면 필터된 총점으로 교체
      if (subjectFilter && subjectFilter.length > 0) {
        scores.total = getFilteredTotal(scores, subjectFilter)
      }
      return scores
    })
    .sort((a, b) => b.total - a.total)
}

/**
 * @brief 과목별 점수 데이터 추출 (차트용)
 * @param {Array} data - all_results.json 전체 데이터
 * @param {string} subject - 과목명
 * @param {string} section - 섹션명
 * @return {Array} [{ model, score, totalPoints }] 형태 배열
 */
export function getSubjectScores(data, subject, section) {
  return data
    .filter(d => d.subject === subject && d.section === section)
    .map(d => ({
      model: d.model_name,
      score: d.score,
      totalPoints: d.total_points
    }))
    .sort((a, b) => b.score - a.score)
}

/**
 * @brief 비용 데이터 추출 (실제 토큰 사용량 기반)
 * @param {Array} data - all_results.json 전체 데이터
 * @param {Array} overallScores - calculateAllModelScores 결과 또는 filteredScores
 * @param {Object} tokenUsage - token_usage.json의 models 객체
 * @param {Array} subjectFilter - 선택된 과목 배열 (빈 배열이면 전체)
 * @return {Array} 비용 및 효율성 데이터
 */
export function getCostData(data, overallScores, tokenUsage = {}, subjectFilter = []) {
  // 모델별 가격 정보 수집 ($/1M 토큰)
  const priceMap = {}
  data.forEach(d => {
    if (!priceMap[d.model_name] && d.price) {
      priceMap[d.model_name] = {
        input: d.price.input ?? 0,
        output: d.price.output ?? 0
      }
    }
  })

  // 1단계: 기본 데이터 계산
  const results = overallScores.map(score => {
    const price = priceMap[score.model] || { input: 0, output: 0 }
    const usage = tokenUsage[score.model] || {}

    // 토큰 계산: 과목 필터 적용
    let inputTokens, outputTokens

    if (subjectFilter.length > 0) {
      // 과목 필터 활성화
      if (!usage.sections) {
        // sections 데이터 없으면 토큰 0으로 설정 (테이블에는 표시)
        inputTokens = 0
        outputTokens = 0
      } else {
        // 선택된 과목들의 토큰만 합산
        inputTokens = 0
        outputTokens = 0

        subjectFilter.forEach(subject => {
          // "국어" → "국어-공통", "국어-화작" 등 모두 포함
          Object.keys(usage.sections).forEach(sectionKey => {
            if (sectionKey.startsWith(subject + '-') || sectionKey === subject) {
              const section = usage.sections[sectionKey]
              inputTokens += section.input_tokens || 0
              outputTokens += section.output_tokens || 0
            }
          })
        })
      }
    } else {
      // 전체 토큰
      inputTokens = usage.total_input_tokens || 0
      outputTokens = usage.total_output_tokens || 0
    }

    // 실제 비용 계산: 토큰 수 × (가격 / 1M)
    const inputCostActual = inputTokens * (price.input / 1000000)
    const outputCostActual = outputTokens * (price.output / 1000000)
    const totalCost = inputCostActual + outputCostActual

    return {
      model: score.model,
      score: score.total,
      inputPrice: price.input,       // $/1M 토큰 가격
      outputPrice: price.output,     // $/1M 토큰 가격
      inputTokens,
      outputTokens,
      totalCost                      // 실제 테스트 비용 ($)
    }
  }).filter(Boolean) // sections 데이터 없는 모델 제외

  // 2단계: 효율성 계산 (좌표 기반)
  // 좌상단(고점수-저비용)일수록 높은 효율
  const maxCost = Math.max(...results.map(r => r.totalCost).filter(c => c > 0), 1)
  const SCORE_MAX = getMaxScore(subjectFilter)

  return results.map(r => {
    if (r.totalCost <= 0) {
      return { ...r, efficiency: 0 }
    }
    // 점수 정규화: 0~1 (높을수록 좋음, 0~maxScore 기준)
    const scoreNorm = Math.max(0, Math.min(1, r.score / SCORE_MAX))
    // 비용 정규화: 0~1 (낮을수록 좋음, 반전하여 높을수록 좋음)
    const costNorm = r.totalCost / maxCost
    // 효율성: 0~100 (성능 70%, 비용 30% 가중치)
    const efficiency = (scoreNorm * 0.7 + (1 - costNorm) * 0.3) * 100

    return { ...r, efficiency }
  })
}
