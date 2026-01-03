/**
 * @file Header.jsx
 * @brief 대시보드 상단 헤더 컴포넌트
 */

import { useTranslation } from 'react-i18next'
import { ThemeToggle, LanguageSwitcher } from '@/components/common'

/**
 * @brief 헤더 컴포넌트
 */
export default function Header() {
  const { t } = useTranslation()

  return (
    <header className="bg-gray-900 text-white p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('header.title')}</h1>
          <p className="text-gray-400 text-sm">{t('header.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
