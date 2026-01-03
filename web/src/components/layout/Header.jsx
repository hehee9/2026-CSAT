/**
 * @file Header.jsx
 * @brief 대시보드 상단 헤더 컴포넌트 (모바일 반응형)
 */

import { useTranslation } from 'react-i18next'
import { ThemeToggle, LanguageSwitcher } from '@/components/common'

/**
 * @brief 헤더 컴포넌트
 * @param {Object} props - { onMenuToggle }
 */
export default function Header({ onMenuToggle }) {
  const { t } = useTranslation()

  return (
    <header className="bg-gray-900 text-white p-3 md:p-4">
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

        {/* 제목 */}
        <div className="flex-1 md:flex-none min-w-0">
          <h1 className="text-lg md:text-2xl font-bold truncate">
            <span className="md:hidden">{t('header.titleShort')}</span>
            <span className="hidden md:inline">{t('header.title')}</span>
          </h1>
          <p className="text-gray-400 text-xs md:text-sm hidden md:block">
            {t('header.subtitle')}
          </p>
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
