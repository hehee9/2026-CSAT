/**
 * @file useData.jsx
 * @brief 전역 데이터 상태 관리를 위한 Context 및 Hook
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { loadAllResults, loadTokenUsage, loadQuestionsMetadata, extractUniqueValues } from '@/utils/dataLoader'

const DataContext = createContext(null)

/**
 * @brief 데이터 제공자 컴포넌트
 * @param {Object} props - children
 */
export function DataProvider({ children }) {
  const [data, setData] = useState([])
  const [tokenUsage, setTokenUsage] = useState({})
  const [questionsMetadata, setQuestionsMetadata] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [sections, setSections] = useState({})
  const [models, setModels] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        // 병렬로 데이터 로드
        const [resultsData, usageData, questionsData] = await Promise.all([
          loadAllResults(),
          loadTokenUsage(),
          loadQuestionsMetadata()
        ])

        setData(resultsData)
        setTokenUsage(usageData)
        setQuestionsMetadata(questionsData)

        // 메타데이터 추출
        const { subjects, sections, models } = extractUniqueValues(resultsData)
        setSubjects(subjects)
        setSections(sections)
        setModels(models)

        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const value = {
    data,
    tokenUsage,
    questionsMetadata,
    loading,
    error,
    subjects,
    sections,
    models
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

/**
 * @brief 데이터 컨텍스트 사용 훅
 * @return {Object} { data, tokenUsage, questionsMetadata, loading, error, subjects, sections, models }
 */
export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
