/**
 * @file App.jsx
 * @brief 2026 수능 LLM 풀이 대시보드 - 메인 App 컴포넌트
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DataProvider, useData } from '@/hooks/useData'
import { ThemeProvider } from '@/hooks/useTheme'
import { useSidebar } from '@/hooks/useSidebar'
import { Header, Sidebar, Footer, BottomNav } from '@/components/layout'
import {
  ScoreBarChart,
  ScoreBreakdownChart,
  CostScatterChart,
  TokenUsageChart,
  QuestionHeatmap,
  ModelCompareChart,
  ChoiceSelectionChart
} from '@/components/charts'
import { ScoreTable, CostTable } from '@/components/tables'
import { ModelSelectDropdown } from '@/components/common'
import { calculateAllModelScores, getCostData, getMaxScore } from '@/utils/dataTransform'
import { transformToHeatmapData, transformToRadarData } from '@/utils/heatmapTransform'
import { transformToChoiceData } from '@/utils/choiceTransform'
import { getModelColor, getVendor, VENDORS, groupModelsByVendor, getSortedVendors, getDefaultSelectedModels } from '@/utils/colorUtils'

/**
 * @brief 탭 정의
 */
const TAB_KEYS = ['overview', 'subjects', 'compare', 'cost']

/**
 * @brief 탐구 과목 목록 (데이터에서는 subject로 저장됨)
 */
const EXPLORATION_SUBJECTS = ['물리1', '화학1', '생명1', '사회문화']

/**
 * @brief 과목/섹션명 → 번역 키 맵핑
 */
const SUBJECT_I18N_KEYS = {
  '국어': 'subjects.korean',
  '수학': 'subjects.math',
  '영어': 'subjects.english',
  '한국사': 'subjects.history',
  '탐구': 'subjects.exploration',
  '공통': 'subjects.common',
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
 * @brief 과목/섹션명 번역 헬퍼
 * @param {string} name - 과목/섹션명
 * @param {function} t - 번역 함수
 * @return {string} 번역된 이름
 */
function _translateSubject(name, t) {
  return SUBJECT_I18N_KEYS[name] ? t(SUBJECT_I18N_KEYS[name]) : name
}

/**
 * @brief 대시보드 메인 컴포넌트
 */
function Dashboard() {
  const { t } = useTranslation()
  const { data, tokenUsage, loading, error, models, subjects, sections } = useData()
  const sidebar = useSidebar()

  const [filters, setFilters] = useState({
    subjects: [],
    models: [],
    sortBy: 'score_desc',
    showDetail: false
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [compareModels, setCompareModels] = useState([])
  const [hoveredModel, setHoveredModel] = useState(null)
  const subjectSelectRef = useRef(null)
  const sectionSelectRef = useRef(null)
  const mainRef = useRef(null)
  const scrollPositions = useRef({})
  const isInitialLoad = useRef(true)

  // 전체 모델 점수 계산 (과목 필터 적용)
  const overallScores = useMemo(() => {
    if (!data?.length || !models?.length) return []
    return calculateAllModelScores(data, models, filters.subjects)
  }, [data, models, filters.subjects])

  // 동적 만점 계산
  const maxScore = useMemo(() => {
    return getMaxScore(filters.subjects)
  }, [filters.subjects])

  /**
   * @brief 데이터 로드 완료 후 기본 모델 필터 설정
   * - 각 개발사별 상위 min(floor(50%), 4개) 모델만 기본 활성화 (최소 1개)
   * - 최초 로드 시에만 적용
   */
  useEffect(() => {
    if (loading || !data?.length || !models?.length || !isInitialLoad.current) return

    const allScores = calculateAllModelScores(data, models, [])
    const defaultModels = getDefaultSelectedModels(models, allScores)

    setFilters(prev => ({ ...prev, models: defaultModels }))
    isInitialLoad.current = false
  }, [loading, data, models])

  // 필터 및 정렬 적용
  const filteredScores = useMemo(() => {
    let result = [...overallScores]

    // 모델 필터
    if (filters.models.length > 0) {
      result = result.filter(s => filters.models.includes(s.model))
    }

    // 정렬
    switch (filters.sortBy) {
      case 'score_asc':
        result.sort((a, b) => a.total - b.total)
        break
      case 'name_asc':
        result.sort((a, b) => a.model.localeCompare(b.model))
        break
      case 'name_desc':
        result.sort((a, b) => b.model.localeCompare(a.model))
        break
      case 'vendor':
        // VENDORS 배열 순서대로, 같은 개발사 내에서는 이름 내림차순
        result.sort((a, b) => {
          const vendorA = VENDORS.findIndex(v => v.pattern?.test(a.model))
          const vendorB = VENDORS.findIndex(v => v.pattern?.test(b.model))
          const idxA = vendorA === -1 ? VENDORS.length : vendorA
          const idxB = vendorB === -1 ? VENDORS.length : vendorB
          if (idxA !== idxB) return idxA - idxB
          return b.model.localeCompare(a.model) // 같은 개발사 내에서는 이름 내림차순
        })
        break
      case 'score_desc':
      default:
        result.sort((a, b) => b.total - a.total)
    }

    return result
  }, [overallScores, filters])

  // 비용 데이터 (모델 필터링 + 과목 필터링 적용)
  const costData = useMemo(() => {
    if (!data?.length || !filteredScores?.length) return []
    return getCostData(data, filteredScores, tokenUsage || {}, filters.subjects)
  }, [data, filteredScores, tokenUsage, filters.subjects])

  // 히트맵 데이터
  const heatmapData = useMemo(() => {
    if (!data?.length || !selectedSubject || !selectedSection) return {}

    // 탐구 과목인 경우: 실제 데이터의 subject=섹션명, section="탐구"
    if (selectedSubject === '탐구') {
      return transformToHeatmapData(data, selectedSection, '탐구')
    }

    return transformToHeatmapData(data, selectedSubject, selectedSection)
  }, [data, selectedSubject, selectedSection])

  // 레이더 차트 데이터
  const radarData = useMemo(() => {
    if (!overallScores?.length || !compareModels?.length) return []
    return transformToRadarData(overallScores, compareModels, t)
  }, [overallScores, compareModels, t])

  // 표시할 모델 목록 (필터 및 정렬 적용 - filteredScores 순서 따름)
  const displayModels = useMemo(() => {
    return filteredScores.map(s => s.model)
  }, [filteredScores])

  // 선지 선택률 데이터
  const choiceData = useMemo(() => {
    if (!heatmapData || !Object.keys(heatmapData).length || !displayModels?.length) return []
    return transformToChoiceData(heatmapData, displayModels, selectedSubject, selectedSection)
  }, [heatmapData, displayModels, selectedSubject, selectedSection])

  // 가상 과목 목록 생성 (탐구를 하나로 묶음)
  const virtualSubjects = useMemo(() => {
    const baseSubjects = subjects.filter(s => !EXPLORATION_SUBJECTS.includes(s))
    if (subjects.some(s => EXPLORATION_SUBJECTS.includes(s))) {
      return [...baseSubjects, '탐구']
    }
    return baseSubjects
  }, [subjects])

  // 과목 선택 시 섹션 목록
  const availableSections = useMemo(() => {
    if (!selectedSubject) return []

    // 탐구 선택 시 -> 개별 탐구 과목들을 섹션으로 표시
    if (selectedSubject === '탐구') {
      return subjects.filter(s => EXPLORATION_SUBJECTS.includes(s))
    }

    // 영어/한국사처럼 섹션이 자기 자신인 경우 빈 배열 반환
    const secs = sections[selectedSubject] || []
    if (secs.length === 1 && secs[0] === selectedSubject) {
      return []
    }

    return secs
  }, [selectedSubject, subjects, sections])

  /**
   * @brief 탭 전환 시 스크롤 위치 저장/복원
   * @param {string} newTab - 새 탭 키
   */
  const handleTabChange = useCallback((newTab) => {
    // 현재 탭 스크롤 위치 저장
    if (mainRef.current) {
      scrollPositions.current[activeTab] = mainRef.current.scrollTop
    }

    setActiveTab(newTab)

    // 새 탭 스크롤 위치 복원 (다음 렌더 사이클에서)
    requestAnimationFrame(() => {
      if (mainRef.current) {
        mainRef.current.scrollTop = scrollPositions.current[newTab] || 0
      }
    })
  }, [activeTab])

  /**
   * @brief 과목 선택 시 자동 섹션 설정
   */
  const handleSubjectChange = useCallback((newSubject) => {
    setSelectedSubject(newSubject)

    if (!newSubject) {
      setSelectedSection('')
      return
    }

    // 영어/한국사: 섹션이 자기 자신인 경우 자동 설정
    if (sections[newSubject]?.length === 1 && sections[newSubject][0] === newSubject) {
      setSelectedSection(newSubject)
    }
    // 탐구: 첫 번째 탐구 과목 자동 선택
    else if (newSubject === '탐구') {
      const firstExp = subjects.find(s => EXPLORATION_SUBJECTS.includes(s))
      setSelectedSection(firstExp || '')
    }
    // 일반 과목: 첫 번째 섹션 (공통) 자동 선택
    else {
      const secs = sections[newSubject] || []
      setSelectedSection(secs[0] || '')
    }
  }, [sections, subjects])

  // 데이터 로드 완료 후 기본 과목 선택
  useEffect(() => {
    if (!loading && subjects.length > 0 && !selectedSubject) {
      const firstSubject = subjects.find(s => !EXPLORATION_SUBJECTS.includes(s))
      if (firstSubject) {
        handleSubjectChange(firstSubject)
      }
    }
  }, [loading, subjects, selectedSubject, handleSubjectChange])

  // 과목 드롭다운 휠 스크롤 이벤트 등록 (passive: false로 스크롤 방지)
  useEffect(() => {
    const el = subjectSelectRef.current
    if (!el) return

    const handler = (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!virtualSubjects.length) return

      const currentIndex = virtualSubjects.indexOf(selectedSubject)
      let newIndex

      if (e.deltaY > 0) {
        newIndex = currentIndex >= virtualSubjects.length - 1 ? 0 : currentIndex + 1
      } else {
        newIndex = currentIndex <= 0 ? virtualSubjects.length - 1 : currentIndex - 1
      }

      handleSubjectChange(virtualSubjects[newIndex])
    }

    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [virtualSubjects, selectedSubject, handleSubjectChange, activeTab])

  // 섹션 드롭다운 휠 스크롤 이벤트 등록
  useEffect(() => {
    const el = sectionSelectRef.current
    if (!el) return

    const handler = (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!availableSections.length) return

      const currentIndex = availableSections.indexOf(selectedSection)
      let newIndex

      if (e.deltaY > 0) {
        newIndex = currentIndex >= availableSections.length - 1 ? 0 : currentIndex + 1
      } else {
        newIndex = currentIndex <= 0 ? availableSections.length - 1 : currentIndex - 1
      }

      setSelectedSection(availableSections[newIndex])
    }

    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [availableSections, selectedSection, activeTab])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">{t('common.error')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Header onMenuToggle={sidebar.toggle} />
      <div className="flex flex-1">
        <Sidebar
          filters={filters}
          onFilterChange={setFilters}
          hoveredModel={hoveredModel}
          onModelHover={setHoveredModel}
          isOpen={sidebar.isOpen}
          onClose={sidebar.close}
        />
        <main
          ref={mainRef}
          className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6"
          onClick={(e) => {
            // 빈 공간 클릭 시 호버 효과 해제
            if (e.target === e.currentTarget) {
              setHoveredModel(null)
            }
          }}
        >
          {/* 탭 네비게이션 (데스크톱) */}
          <div className="desktop-tabs hidden md:flex gap-2 mb-6">
            {TAB_KEYS.map(tabKey => (
              <button
                key={tabKey}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tabKey
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => handleTabChange(tabKey)}
              >
                {t(`tabs.${tabKey}`)}
              </button>
            ))}
          </div>

          {/* 콘텐츠 영역 */}
          <div className="space-y-6">
            {/* 종합 대시보드 탭 */}
            {activeTab === 'overview' && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <ScoreBarChart
                    data={filteredScores.map(s => ({
                      model: s.model,
                      score: s.total,
                      totalPoints: maxScore,
                      color: getModelColor(s.model)
                    }))}
                    maxScore={maxScore}
                    title={`${t('charts.totalScore')} (${t('charts.maxPoints', { max: maxScore })})`}
                    subtitle={(() => {
                      if (filters.subjects.length === 0) return null

                      // 과목 계층 정의
                      const HIERARCHY = {
                        '국어': ['화작', '언매'],
                        '수학': ['확통', '미적', '기하'],
                        '탐구': ['물리1', '화학1', '생명1', '사문']
                      }

                      // 선택된 항목을 부모별로 그룹화
                      const grouped = { '국어': [], '수학': [], '탐구': [], standalone: [] }
                      for (const item of filters.subjects) {
                        if (item === '영어' || item === '한국사') {
                          grouped.standalone.push(item)
                        } else if (item.includes('-')) {
                          const [parent, child] = item.split('-')
                          if (grouped[parent]) grouped[parent].push(child)
                        }
                      }

                      const result = []

                      // 국어: 모두 선택 → "국어", 일부 → 하위만
                      if (grouped['국어'].length === HIERARCHY['국어'].length) {
                        result.push('국어')
                      } else {
                        result.push(...grouped['국어'])
                      }

                      // 수학: 동일 로직
                      if (grouped['수학'].length === HIERARCHY['수학'].length) {
                        result.push('수학')
                      } else {
                        result.push(...grouped['수학'])
                      }

                      // 영어, 한국사
                      result.push(...grouped.standalone)

                      // 탐구: 개별 표시
                      result.push(...grouped['탐구'])

                      // 전체 선택 시 null
                      const allSelected =
                        grouped['국어'].length === HIERARCHY['국어'].length &&
                        grouped['수학'].length === HIERARCHY['수학'].length &&
                        grouped.standalone.includes('영어') &&
                        grouped.standalone.includes('한국사') &&
                        grouped['탐구'].length === HIERARCHY['탐구'].length

                      return allSelected ? null : result.join(', ')
                    })()}
                    hoveredModel={hoveredModel}
                    onModelHover={setHoveredModel}
                  />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <ScoreTable
                    data={filteredScores}
                    title={t('charts.scoreTable')}
                    showDetail={filters.showDetail}
                    onToggleDetail={() => setFilters(f => ({ ...f, showDetail: !f.showDetail }))}
                    subjectFilter={filters.subjects}
                    maxScore={maxScore}
                    hoveredModel={hoveredModel}
                    onModelHover={setHoveredModel}
                  />
                </div>
              </>
            )}

            {/* 과목별 상세 탭 */}
            {activeTab === 'subjects' && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex gap-4 mb-6">
                    <select
                      ref={subjectSelectRef}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                      value={selectedSubject}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                    >
                      <option value="">{t('charts.selectSubject')}</option>
                      {virtualSubjects.map(s => (
                        <option key={s} value={s}>{_translateSubject(s, t)}</option>
                      ))}
                    </select>
                    {selectedSubject && availableSections.length > 0 && (
                      <select
                        ref={sectionSelectRef}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                      >
                        {availableSections.map(s => (
                          <option key={s} value={s}>{_translateSubject(s, t)}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedSubject && selectedSection && Object.keys(heatmapData).length > 0 && (
                    <QuestionHeatmap
                      data={heatmapData}
                      models={displayModels}
                      title={`${_translateSubject(selectedSubject, t)} - ${_translateSubject(selectedSection, t)} ${t('charts.questionStatus')}`}
                    />
                  )}

                  {selectedSubject && selectedSection && choiceData.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <ChoiceSelectionChart
                        data={choiceData}
                        title={`${_translateSubject(selectedSubject, t)} - ${_translateSubject(selectedSection, t)} ${t('charts.choiceRate')}`}
                      />
                    </div>
                  )}

                  {!selectedSubject && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      {t('charts.selectSubject')}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* 모델 비교 탭 */}
            {activeTab === 'compare' && (() => {
              // 정렬된 모델 순서로 개발사별 그룹화
              const sortedModels = filteredScores.map(s => s.model)
              const groupedCompareModels = groupModelsByVendor(sortedModels)
              const sortedVendors = getSortedVendors(groupedCompareModels)

              return (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t('charts.compareModels')}
                    </h4>

                    {/* 모바일: 드롭다운 */}
                    <div className="md:hidden">
                      <ModelSelectDropdown
                        models={sortedModels}
                        selected={compareModels}
                        onChange={setCompareModels}
                        maxSelect={5}
                      />
                    </div>

                    {/* 데스크톱: 체크박스 그룹 */}
                    <div className="hidden md:block space-y-3">
                      {sortedVendors.map(vendor => {
                        const vendorModels = groupedCompareModels[vendor.id]
                        if (!vendorModels?.length) return null

                        return (
                          <div key={vendor.id}>
                            {/* 개발사 헤더 */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: vendor.color }}
                              />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {vendor.name}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                ({vendorModels.length})
                              </span>
                            </div>
                            {/* 모델 목록 */}
                            <div className="flex flex-wrap gap-2 ml-5">
                              {vendorModels.map(model => {
                                const isSelected = compareModels.includes(model)
                                const isFiltered = filters.models.length === 0 ||
                                                   filters.models.includes(model)
                                return (
                                  <label
                                    key={model}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-colors border ${
                                      isSelected
                                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                        : isFiltered
                                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                          : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-60'
                                    }`}
                                    onMouseEnter={() => setHoveredModel(model)}
                                    onMouseLeave={() => setHoveredModel(null)}
                                  >
                                    <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked && compareModels.length < 5) {
                                          setCompareModels([...compareModels, model])
                                        } else if (!e.target.checked) {
                                          setCompareModels(compareModels.filter(m => m !== model))
                                        }
                                      }}
                                    />
                                    <span className="text-sm">{model}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <ModelCompareChart
                    data={radarData}
                    selectedModels={compareModels}
                    allScores={overallScores}
                    title={t('charts.modelCompare')}
                    height={450}
                    hoveredModel={hoveredModel}
                    onModelHover={setHoveredModel}
                  />
                </div>
              )
            })()}

            {/* 비용 분석 탭 */}
            {activeTab === 'cost' && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <CostScatterChart
                    data={costData}
                    title={t('charts.costVsPerformance')}
                    maxScore={maxScore}
                  />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <TokenUsageChart
                    data={tokenUsage}
                    models={displayModels}
                    subjectFilter={filters.subjects}
                    title={t('charts.tokenUsage')}
                  />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <CostTable
                    data={costData}
                    title={t('charts.costInfo')}
                  />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
      <Footer />
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  )
}

/**
 * @brief App 루트 컴포넌트
 */
export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <Dashboard />
      </DataProvider>
    </ThemeProvider>
  )
}
