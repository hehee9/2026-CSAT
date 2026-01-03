/**
 * @file SubjectFilter.jsx
 * @brief 과목 필터 체크박스 컴포넌트 (계층적 구조 지원, Tri-State Checkbox)
 */

import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * @brief 과목 계층 구조 정의
 * - showDetail=false: 상위 과목만 표시
 * - showDetail=true: 상위 + 하위 과목 트리 표시
 */
const SUBJECT_HIERARCHY = {
  '국어': ['화작', '언매'],
  '수학': ['확통', '미적', '기하'],
  '영어': [],
  '한국사': [],
  '탐구': ['물리1', '화학1', '생명1', '사회문화']
}

/** @brief 상위 과목 목록 (순서 유지) */
const PARENT_SUBJECTS = ['국어', '수학', '영어', '한국사', '탐구']

/** @brief 과목명 → 번역 키 맵핑 */
const SUBJECT_I18N_KEYS = {
  '국어': 'subjects.korean',
  '수학': 'subjects.math',
  '영어': 'subjects.english',
  '한국사': 'subjects.history',
  '탐구': 'subjects.exploration',
  '화작': 'subjects.hwajak',
  '언매': 'subjects.unmae',
  '확통': 'subjects.hwakton',
  '미적': 'subjects.mijeok',
  '기하': 'subjects.giha',
  '물리1': 'subjects.physics1',
  '화학1': 'subjects.chemistry1',
  '생명1': 'subjects.biology1',
  '사회문화': 'subjects.society'
}

/**
 * @brief 과목 필터 컴포넌트
 * @param {Object} props - { selected, onChange, showDetail }
 * @param {string[]} props.selected - 선택된 과목 배열
 * @param {function} props.onChange - 선택 변경 콜백
 * @param {boolean} props.showDetail - 세부 과목 표시 여부
 */
export default function SubjectFilter({ selected, onChange, showDetail = false }) {
  const { t } = useTranslation()
  /** @brief 상위 과목 체크박스 ref 저장 */
  const checkboxRefs = useRef({})

  /**
   * @brief 상위 과목의 체크박스 상태 계산
   * @param {string} parent - 상위 과목명
   * @return {'checked' | 'unchecked' | 'indeterminate'} 체크 상태
   */
  function getParentState(parent) {
    const children = SUBJECT_HIERARCHY[parent]

    // 하위 없는 과목 (영어, 한국사)
    if (!children?.length) {
      return selected.includes(parent) ? 'checked' : 'unchecked'
    }

    // 하위 있는 과목: 선택된 하위 개수로 판단
    const selectedCount = children.filter(c => selected.includes(`${parent}-${c}`)).length
    if (selectedCount === 0) return 'unchecked'
    if (selectedCount === children.length) return 'checked'
    return 'indeterminate'
  }

  /**
   * @brief 상위 과목 토글 (마스터 토글)
   * - 하위 있으면: 모든 하위 on/off
   * - 하위 없으면: 상위만 토글
   * @param {string} parent - 상위 과목명
   */
  function handleParentToggle(parent) {
    const children = SUBJECT_HIERARCHY[parent]

    // 하위 없는 과목 (영어, 한국사)
    if (!children?.length) {
      onChange(selected.includes(parent)
        ? selected.filter(s => s !== parent)
        : [...selected, parent])
      return
    }

    // 모든 하위가 선택됨 → 모두 해제
    // 그 외 → 모든 하위 선택
    const allSelected = children.every(c => selected.includes(`${parent}-${c}`))
    const childKeys = children.map(c => `${parent}-${c}`)
    const filtered = selected.filter(s => !childKeys.includes(s) && s !== parent)

    onChange(allSelected ? filtered : [...filtered, ...childKeys])
  }

  /** @brief indeterminate 상태 동기화 */
  useEffect(() => {
    PARENT_SUBJECTS.forEach(parent => {
      const ref = checkboxRefs.current[parent]
      if (ref) {
        const children = SUBJECT_HIERARCHY[parent]
        if (children?.length) {
          const count = children.filter(c => selected.includes(`${parent}-${c}`)).length
          ref.indeterminate = count > 0 && count < children.length
        }
      }
    })
  }, [selected])

  /**
   * @brief 하위 과목 토글
   * @param {string} parent - 상위 과목명
   * @param {string} child - 하위 과목명
   */
  function handleChildToggle(parent, child) {
    const fullName = `${parent}-${child}`

    if (selected.includes(fullName)) {
      onChange(selected.filter(s => s !== fullName))
    } else {
      onChange([...selected, fullName])
    }
  }

  /**
   * @brief 하위 과목 선택 여부 확인
   * @param {string} parent - 상위 과목명
   * @param {string} child - 하위 과목명
   * @return {boolean} 선택 여부
   */
  function isChildSelected(parent, child) {
    return selected.includes(`${parent}-${child}`)
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{t('sidebar.subjectFilter')}</h3>
      <div className="space-y-1">
        {PARENT_SUBJECTS.map(parent => {
          const children = SUBJECT_HIERARCHY[parent]
          const hasChildren = children && children.length > 0

          return (
            <div key={parent}>
              {/* 상위 과목 */}
              <label className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded text-gray-800 dark:text-gray-200">
                <input
                  ref={el => checkboxRefs.current[parent] = el}
                  type="checkbox"
                  checked={getParentState(parent) === 'checked'}
                  onChange={() => handleParentToggle(parent)}
                  className="mr-2 rounded"
                />
                <span className="text-sm font-medium">{t(SUBJECT_I18N_KEYS[parent])}</span>
              </label>

              {/* 하위 과목 (showDetail이 true이고 하위 과목이 있을 때만) */}
              {showDetail && hasChildren && (
                <div className="ml-5 space-y-0.5">
                  {children.map(child => (
                    <label
                      key={`${parent}-${child}`}
                      className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={isChildSelected(parent, child)}
                        onChange={() => handleChildToggle(parent, child)}
                        className="mr-2 rounded text-blue-400"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{t(SUBJECT_I18N_KEYS[child])}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
