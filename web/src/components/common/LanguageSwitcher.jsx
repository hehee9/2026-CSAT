/**
 * @file LanguageSwitcher.jsx
 * @brief 언어 전환 버튼 컴포넌트
 */

import { useTranslation } from 'react-i18next'

/**
 * @brief 언어 전환 버튼
 */
export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const isKorean = i18n.language === 'ko'

  function handleToggle() {
    const newLang = isKorean ? 'en' : 'ko'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  return (
    <button
      onClick={handleToggle}
      className="px-2 py-1 text-sm font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-gray-300"
      aria-label={isKorean ? 'Switch to English' : '한국어로 전환'}
    >
      {isKorean ? 'EN' : '한'}
    </button>
  )
}
