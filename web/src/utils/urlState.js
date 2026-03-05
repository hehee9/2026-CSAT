/**
 * @file urlState.js
 * @brief URL 쿼리 기반 대시보드 초기 상태 유틸리티
 */

const VALID_TABS = new Set(['overview', 'subjects', 'compare', 'cost'])
const VALID_SCORE_VIEWS = new Set(['average', 'bestWorst', 'withImage', 'withoutImage'])
const VALID_THEMES = new Set(['light', 'dark'])

function _getSearchParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

function _getEnumValue(value, validSet, fallback = '') {
  return value && validSet.has(value) ? value : fallback
}

function _getListValue(value) {
  if (!value) return []
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

/**
 * @brief 대시보드 초기 URL 상태 파싱
 * @return {Object} 초기 상태
 */
export function getDashboardQueryState() {
  const params = _getSearchParams()

  return {
    tab: _getEnumValue(params.get('tab'), VALID_TABS, 'overview'),
    scoreView: _getEnumValue(params.get('scoreView'), VALID_SCORE_VIEWS, 'average'),
    subjects: _getListValue(params.get('subjects')),
    selectedSubject: params.get('selectedSubject') || '',
    selectedSection: params.get('selectedSection') || '',
    theme: _getEnumValue(params.get('theme'), VALID_THEMES, '')
  }
}

/**
 * @brief URL로 강제된 테마 반환
 * @return {'light' | 'dark' | ''} 강제 테마
 */
export function getForcedThemeFromUrl() {
  return getDashboardQueryState().theme
}
