/**
 * @file Header.jsx
 * @brief 대시보드 상단 헤더 컴포넌트 (모바일 반응형)
 */

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeToggle, LanguageSwitcher } from '@/components/common'

/**
 * @brief 헤더 컴포넌트
 * @param {Object} props - { onMenuToggle, mode, onModeChange }
 */
export default function Header({ onMenuToggle, mode = 'default', onModeChange }) {
  const { t } = useTranslation()
  const isHardMode = mode === 'hard'
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimeout = useRef(null)

  /**
   * @brief 툴팁 표시 (hover/focus)
   */
  const _handleTooltipShow = () => {
    clearTimeout(tooltipTimeout.current)
    setShowTooltip(true)
  }

  /**
   * @brief 툴팁 숨기기 (약간의 딜레이로 깜빡임 방지)
   */
  const _handleTooltipHide = () => {
    tooltipTimeout.current = setTimeout(() => setShowTooltip(false), 150)
  }

  useEffect(() => {
    return () => clearTimeout(tooltipTimeout.current)
  }, [])

  /**
   * @brief 모드 토글 (default <-> hard)
   */
  const _handleModeToggle = () => {
    onModeChange?.(isHardMode ? 'default' : 'hard')
  }

  return (
    <header className={`${isHardMode ? 'bg-red-950' : 'bg-gray-900'} text-white p-3 md:p-4 transition-colors duration-300`}>
      <div className="container mx-auto flex items-center justify-between gap-2">
        {/* 햄버거 메뉴 버튼 (모바일) */}
        <button
          className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
          onClick={onMenuToggle}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* 제목 + 모드 토글 */}
        <div className="flex-1 md:flex-none flex items-center gap-3 md:gap-4 min-w-0">
          {/* 제목 블록 */}
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold truncate">
              <span className="md:hidden">{t('header.titleShort')}</span>
              <span className="hidden md:inline">{t('header.title')}</span>
            </h1>
            <p className="text-gray-400 text-xs md:text-sm hidden md:block">
              {t('header.subtitle')}
            </p>
          </div>

          {/* 모드 토글 버튼 (ⓘ 포함) */}
          <div
            className="relative shrink-0"
            onMouseEnter={_handleTooltipShow}
            onMouseLeave={_handleTooltipHide}
          >
            <button
              type="button"
              onClick={_handleModeToggle}
              onFocus={_handleTooltipShow}
              onBlur={_handleTooltipHide}
              className={`flex items-center gap-1.5 text-base md:text-lg font-semibold px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer border border-white/20 hover:border-white/40 hover:bg-white/5 ${
                isHardMode
                  ? 'text-rose-300'
                  : 'text-sky-300'
              }`}
            >
              {isHardMode ? t('header.modeHard') : t('header.modeDefault')}
              <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
              </svg>
            </button>

            {/* 툴팁 */}
            {showTooltip && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-2 bg-gray-800 border border-gray-600 text-gray-200 text-xs rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
                {isHardMode ? t('header.modeHardDesc') : t('header.modeDefaultDesc')}
                {/* 툴팁 화살표 */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-800 border-l border-t border-gray-600 rotate-45" />
              </div>
            )}
          </div>
        </div>

        {/* 데스크톱 토글 버튼 (언어/테마) */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
