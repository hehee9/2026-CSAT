/**
 * @file modelMeta.js
 * @brief 부분 벤치마크 모델 메타데이터 유틸리티
 */

const PARTIAL_BENCHMARK_MODELS = {
  'GPT-5.4 (xhigh, wrong-only)': {
    isPartialBenchmark: true,
    displaySuffix: '*',
    descriptionKey: 'models.partialWrongOnly'
  }
}

export function getModelMeta(modelName) {
  return PARTIAL_BENCHMARK_MODELS[modelName] || null
}

export function isPartialBenchmarkModel(modelName) {
  return Boolean(getModelMeta(modelName)?.isPartialBenchmark)
}

export function formatModelDisplayName(modelName) {
  const meta = getModelMeta(modelName)
  if (!meta?.displaySuffix) return modelName
  if (modelName.endsWith(meta.displaySuffix)) return modelName
  return `${modelName}${meta.displaySuffix}`
}

export function hasPartialBenchmark(models = []) {
  return models.some(model => isPartialBenchmarkModel(model))
}
