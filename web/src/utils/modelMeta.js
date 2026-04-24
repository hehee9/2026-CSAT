/**
 * @file modelMeta.js
 * @brief 모델 메타데이터 유틸리티 (부분 벤치마크, 이미지 미지원, 비표준 설정)
 */

const PARTIAL_BENCHMARK_MODELS = {
  'GPT-5.5 (xhigh*)': {
    isPartialBenchmark: true,
    displaySuffix: '*',
    descriptionKey: 'models.partialWrongOnly'
  },
  'GPT-5.4 (xhigh*)': {
    isPartialBenchmark: true,
    displaySuffix: '*',
    descriptionKey: 'models.partialWrongOnly'
  },
  'Claude Opus 4.7 (max*)': {
    isPartialBenchmark: true,
    displaySuffix: '*',
    descriptionKey: 'models.partialWrongOnly'
  }
}

/**
 * @brief 이미지 인식 미지원 모델 패턴
 */
const NO_VISION_PATTERNS = [/^deepseek/i, /exaone/i, /^solar/i, /^glm/i]

/**
 * @brief 비표준 설정 모델 (부분 벤치마크 모델과 동일)
 */
const NON_STANDARD_MODELS = new Set(Object.keys(PARTIAL_BENCHMARK_MODELS))

export function getModelMeta(modelName) {
  return PARTIAL_BENCHMARK_MODELS[modelName] || null
}

export function isPartialBenchmarkModel(modelName) {
  return Boolean(getModelMeta(modelName)?.isPartialBenchmark)
}

export function formatModelDisplayName(modelName) {
  const meta = getModelMeta(modelName)
  if (!meta?.displaySuffix) return modelName
  if (modelName.includes(meta.displaySuffix)) return modelName
  return `${modelName}${meta.displaySuffix}`
}

export function hasPartialBenchmark(models = []) {
  return models.some(model => isPartialBenchmarkModel(model))
}

/**
 * @brief 이미지 미지원 모델 여부
 * @param {string} modelName - 모델명
 * @return {boolean}
 */
export function hasNoVision(modelName) {
  return NO_VISION_PATTERNS.some(p => p.test(modelName))
}

/**
 * @brief 비표준 설정 모델 여부
 * @param {string} modelName - 모델명
 * @return {boolean}
 */
export function isNonStandard(modelName) {
  return NON_STANDARD_MODELS.has(modelName)
}

/**
 * @brief 모델의 시각적 플래그 반환
 * @param {string} modelName - 모델명
 * @return {{ noVision: boolean, nonStandard: boolean }}
 */
export function getModelFlags(modelName) {
  return {
    noVision: hasNoVision(modelName),
    nonStandard: isNonStandard(modelName)
  }
}

/**
 * @brief 모델 목록에 플래그가 있는 모델이 포함되어 있는지 확인
 * @param {string[]} models - 모델명 배열
 * @return {{ hasNoVision: boolean, hasNonStandard: boolean }}
 */
export function getAnyModelFlags(models = []) {
  return {
    hasNoVision: models.some(hasNoVision),
    hasNonStandard: models.some(isNonStandard)
  }
}
