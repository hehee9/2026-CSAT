/**
 * @file useSidebar.jsx
 * @brief 사이드바 상태 관리 및 스와이프 제스처 훅
 */

import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * @brief 사이드바 열림/닫힘 상태 및 스와이프 제스처 관리
 * @return {Object} { isOpen, open, close, toggle }
 */
export function useSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(prev => !prev), [])

  // 스와이프 제스처 핸들러
  useEffect(() => {
    /**
     * @brief 터치 시작 핸들러
     */
    const handleTouchStart = (e) => {
      const touch = e.touches[0]
      // 화면 왼쪽 가장자리(30px 이내)에서 터치 시작 시에만 추적
      if (touch.clientX < 30 && !isOpen) {
        touchStartX.current = touch.clientX
        touchStartY.current = touch.clientY
      }
      // 사이드바가 열려있을 때는 닫기 스와이프 감지
      if (isOpen && touch.clientX < 280) {
        touchStartX.current = touch.clientX
        touchStartY.current = touch.clientY
      }
    }

    /**
     * @brief 터치 이동 핸들러
     */
    const handleTouchMove = (e) => {
      if (touchStartX.current === null) return

      const touch = e.touches[0]
      const diffX = touch.clientX - touchStartX.current
      const diffY = touch.clientY - touchStartY.current

      // 수직 스크롤이 더 크면 무시
      if (Math.abs(diffY) > Math.abs(diffX)) {
        touchStartX.current = null
        touchStartY.current = null
        return
      }

      // 열기: 오른쪽으로 50px 이상 스와이프
      if (!isOpen && diffX > 50) {
        open()
        touchStartX.current = null
        touchStartY.current = null
      }

      // 닫기: 왼쪽으로 50px 이상 스와이프
      if (isOpen && diffX < -50) {
        close()
        touchStartX.current = null
        touchStartY.current = null
      }
    }

    /**
     * @brief 터치 종료 핸들러
     */
    const handleTouchEnd = () => {
      touchStartX.current = null
      touchStartY.current = null
    }

    // 모바일에서만 스와이프 제스처 활성화
    const mediaQuery = window.matchMedia('(max-width: 767px)')

    if (mediaQuery.matches) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true })
      document.addEventListener('touchmove', handleTouchMove, { passive: true })
      document.addEventListener('touchend', handleTouchEnd, { passive: true })
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isOpen, open, close])

  // 사이드바 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  return { isOpen, open, close, toggle }
}
