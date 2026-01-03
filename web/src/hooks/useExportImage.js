/**
 * @file useExportImage.js
 * @brief DOM 요소를 이미지로 내보내기 위한 커스텀 훅
 */

import { useRef, useCallback } from 'react'
import { toPng } from 'html-to-image'

/**
 * @brief 현재 다크모드 여부 확인
 * @return {boolean} 다크모드 여부
 */
function _isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

/**
 * @brief 이미지 내보내기 훅
 * @return {Object} { ref, exportImage }
 */
export function useExportImage() {
  const ref = useRef(null)

  /**
   * @brief 현재 ref 요소를 PNG 이미지로 내보내기
   * @param {string} filename - 저장할 파일명 (기본: 'export.png')
   */
  const exportImage = useCallback(async (filename = 'export.png') => {
    if (!ref.current) return

    try {
      const element = ref.current
      const isDark = _isDarkMode()

      // 캡처 전: overflow가 있는 모든 요소를 visible로 변경 (스크롤바 숨김)
      const overflowElements = element.querySelectorAll('[class*="overflow"]')
      const originalOverflows = Array.from(overflowElements).map(el => el.style.overflow)
      overflowElements.forEach(el => {
        el.style.overflow = 'visible'
      })

      // 캡처 전: data-export-show 요소 표시 (워터마크 등)
      const exportShowElements = element.querySelectorAll('[data-export-show="true"]')
      exportShowElements.forEach(el => {
        el.classList.remove('hidden')
      })

      const padding = 16
      // scrollWidth/scrollHeight로 실제 콘텐츠 크기 측정
      const width = element.scrollWidth + padding * 2
      const height = element.scrollHeight + padding * 2

      // 다크모드에 따른 배경색 설정
      const backgroundColor = isDark ? '#111827' : '#ffffff'

      const dataUrl = await toPng(element, {
        backgroundColor,
        pixelRatio: 2, // 고해상도 출력
        width,
        height,
        // data-export-hide 속성을 가진 요소 제외 (버튼 등)
        filter: (node) => {
          if (node.dataset?.exportHide === 'true') return false
          return true
        },
        // 여백 추가
        style: {
          padding: `${padding}px`
        }
      })

      // 캡처 후: 원래 overflow 스타일 복원
      overflowElements.forEach((el, i) => {
        el.style.overflow = originalOverflows[i]
      })

      // 캡처 후: data-export-show 요소 다시 숨김
      exportShowElements.forEach(el => {
        el.classList.add('hidden')
      })

      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('이미지 내보내기 실패:', err)
    }
  }, [])

  return { ref, exportImage }
}
