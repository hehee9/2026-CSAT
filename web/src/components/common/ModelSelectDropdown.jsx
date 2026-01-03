/**
 * @file ModelSelectDropdown.jsx
 * @brief 모바일용 모델 선택 드롭다운 컴포넌트
 */

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { groupModelsByVendor, getSortedVendors, getModelColor } from '@/utils/colorUtils'

/**
 * @brief 모델 선택 드롭다운 컴포넌트
 * @param {Object} props - { models, selected, onChange, maxSelect }
 */
export default function ModelSelectDropdown({
  models,
  selected,
  onChange,
  maxSelect = 5
}) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const groupedModels = groupModelsByVendor(models)
  const sortedVendors = getSortedVendors(groupedModels)

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  /**
   * @brief 모델 선택/해제 토글
   */
  const handleToggleModel = (model) => {
    if (selected.includes(model)) {
      onChange(selected.filter(m => m !== model))
    } else if (selected.length < maxSelect) {
      onChange([...selected, model])
    }
  }

  /**
   * @brief 선택된 모델 칩 제거
   */
  const handleRemoveModel = (model, e) => {
    e.stopPropagation()
    onChange(selected.filter(m => m !== model))
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* 트리거 버튼 */}
      <button
        className="w-full min-h-[44px] px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {selected.length === 0
            ? t('charts.compareModels')
            : t('charts.modelsSelected', { count: selected.length })
          }
        </span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 선택된 모델 칩 */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map(model => (
            <span
              key={model}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getModelColor(model) }}
              />
              <span className="truncate max-w-[120px]">{model}</span>
              <button
                className="w-4 h-4 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full"
                onClick={(e) => handleRemoveModel(model, e)}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {sortedVendors.map(vendor => {
            const vendorModels = groupedModels[vendor.id]
            if (!vendorModels?.length) return null

            return (
              <div key={vendor.id}>
                {/* 개발사 헤더 (선택 불가) */}
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 sticky top-0 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: vendor.color }}
                  />
                  {vendor.name}
                  <span className="text-gray-400">({vendorModels.length})</span>
                </div>

                {/* 모델 목록 */}
                {vendorModels.map(model => {
                  const isSelected = selected.includes(model)
                  const isDisabled = !isSelected && selected.length >= maxSelect

                  return (
                    <button
                      key={model}
                      className={`w-full text-left px-4 py-3 min-h-[44px] flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : isDisabled
                            ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      disabled={isDisabled}
                      onClick={() => handleToggleModel(model)}
                    >
                      <span className="truncate">{model}</span>
                      {isSelected && (
                        <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
