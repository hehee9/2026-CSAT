/**
 * @file useExportImage.js
 * @brief DOM 요소를 이미지로 내보내기 위한 커스텀 훅
 */

import { useRef, useCallback } from 'react'
import { toPng } from 'html-to-image'

export const README_EXPORT_WIDTH = 1680

function _getExportWidth(element, exportWidth) {
  if (typeof exportWidth === 'number') return exportWidth
  const attrValue = element.dataset?.exportWidth
  if (!attrValue) return undefined

  const parsed = Number(attrValue)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function _nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

async function _waitForFrames(count = 2) {
  for (let i = 0; i < count; i += 1) {
    await _nextFrame()
  }
}

/**
 * @brief 현재 다크모드 여부 확인
 * @return {boolean} 다크모드 여부
 */
function _isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

/**
 * @brief 이미지 내보내기 훅
 * @param {Object} options - 내보내기 옵션
 * @param {number} options.exportWidth - 내보내기 시 임시로 적용할 고정 폭
 * @param {number} options.exportPadding - 캡처 이미지 여백
 * @param {number} options.pixelRatio - 캡처 pixel ratio
 * @return {Object} { ref, exportImage }
 */
export function useExportImage({
  exportWidth,
  exportPadding = 16,
  pixelRatio = 2
} = {}) {
  const ref = useRef(null)

  /**
   * @brief 현재 ref 요소를 PNG 이미지로 내보내기
   * @param {string} filename - 저장할 파일명 (기본: 'export.png')
   */
  const exportImage = useCallback(async (filename = 'export.png') => {
    if (!ref.current) return

    const element = ref.current
    const resolvedExportWidth = _getExportWidth(element, exportWidth)
    const originalWidth = element.style.width
    const originalMaxWidth = element.style.maxWidth
    const originalMinWidth = element.style.minWidth

    // 캡처 전: overflow가 있는 모든 요소를 visible로 변경 (스크롤바 숨김)
    const overflowElements = element.querySelectorAll('[class*="overflow"]')
    const originalOverflows = Array.from(overflowElements).map(el => el.style.overflow)

    // 캡처 전: data-export-show 요소 표시 (워터마크 등)
    const exportShowElements = element.querySelectorAll('[data-export-show="true"]')

    try {
      const isDark = _isDarkMode()
      overflowElements.forEach(el => {
        el.style.overflow = 'visible'
      })

      exportShowElements.forEach(el => {
        el.classList.remove('hidden')
      })

      if (resolvedExportWidth) {
        element.style.width = `${resolvedExportWidth}px`
        element.style.maxWidth = 'none'
        element.style.minWidth = `${resolvedExportWidth}px`
        window.dispatchEvent(new Event('resize'))
        await _waitForFrames(2)
      }

      // scrollWidth/scrollHeight로 실제 콘텐츠 크기 측정
      const width = element.scrollWidth + exportPadding * 2
      const height = element.scrollHeight + exportPadding * 2

      // 다크모드에 따른 배경색 설정
      const backgroundColor = isDark ? '#111827' : '#ffffff'

      const dataUrl = await toPng(element, {
        backgroundColor,
        pixelRatio,
        width,
        height,
        // data-export-hide 속성을 가진 요소 제외 (버튼 등)
        filter: (node) => {
          if (node.dataset?.exportHide === 'true') return false
          return true
        },
        // 여백 추가
        style: {
          padding: `${exportPadding}px`
        }
      })

      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('이미지 내보내기 실패:', err)
    } finally {
      overflowElements.forEach((el, i) => {
        el.style.overflow = originalOverflows[i]
      })

      exportShowElements.forEach(el => {
        el.classList.add('hidden')
      })

      element.style.width = originalWidth
      element.style.maxWidth = originalMaxWidth
      element.style.minWidth = originalMinWidth
      if (resolvedExportWidth) {
        window.dispatchEvent(new Event('resize'))
        await _waitForFrames(1)
      }
    }
  }, [exportPadding, exportWidth, pixelRatio])

  return { ref, exportImage }
}
