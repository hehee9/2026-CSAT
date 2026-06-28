/**
 * @file useData.jsx
 * @brief 전역 데이터 상태 관리를 위한 Context 및 Hook
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { loadAllResults, loadTokenUsage, loadModelMetadata, loadQuestionsMetadata, extractUniqueValues } from '@/utils/dataLoader'

const DataContext = createContext(null)

/**
 * @brief 데이터 제공자 컴포넌트
 * @param {Object} props - { children, mode }
 */
export function DataProvider({ children, mode = 'default' }) {
  const [data, setData] = useState([])
  const [tokenUsage, setTokenUsage] = useState({})
  const [modelMetadata, setModelMetadata] = useState({})
  const [questionsMetadata, setQuestionsMetadata] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [sections, setSections] = useState({})
  const [models, setModels] = useState([])
  const [dataMode, setDataMode] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setError(null)
        // 병렬로 데이터 로드
        const [resultsData, usageData, modelMetadataData, questionsData] = await Promise.all([
          loadAllResults(mode),
          loadTokenUsage(mode),
          loadModelMetadata(),
          loadQuestionsMetadata()
        ])

        if (cancelled) return

        setData(resultsData)
        setTokenUsage(usageData)
        setModelMetadata(modelMetadataData)
        setQuestionsMetadata(questionsData)

        // 메타데이터 추출
        const { subjects, sections, models } = extractUniqueValues(resultsData)
        setSubjects(subjects)
        setSections(sections)
        setModels(models)
        setDataMode(mode)

        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [mode])

  const value = {
    data,
    tokenUsage,
    modelMetadata,
    questionsMetadata,
    loading,
    error,
    subjects,
    sections,
    models,
    dataMode
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

/**
 * @brief 데이터 컨텍스트 사용 훅
 * @return {Object} { data, tokenUsage, modelMetadata, questionsMetadata, loading, error, subjects, sections, models, dataMode }
 */
export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
