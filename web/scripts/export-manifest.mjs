import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')
const imagesDir = path.join(repoRoot, 'docs', 'images')

function createImageTarget({ id, exportKey, fileName, params }) {
  return {
    id,
    exportKey,
    outputPath: path.join(imagesDir, fileName),
    params: {
      theme: 'light',
      ...params
    }
  }
}

export const EXPORT_TARGETS = [
  createImageTarget({
    id: 'overview-total',
    exportKey: 'overview-score-chart',
    fileName: '전체.png',
    params: { tab: 'overview', scoreView: 'average' }
  }),
  createImageTarget({
    id: 'overview-best-worst',
    exportKey: 'overview-score-chart',
    fileName: '최고_최저.png',
    params: { tab: 'overview', scoreView: 'bestWorst' }
  }),
  createImageTarget({
    id: 'overview-with-image',
    exportKey: 'overview-score-chart',
    fileName: '이미지O.png',
    params: { tab: 'overview', scoreView: 'withImage' }
  }),
  createImageTarget({
    id: 'overview-without-image',
    exportKey: 'overview-score-chart',
    fileName: '이미지X.png',
    params: { tab: 'overview', scoreView: 'withoutImage' }
  }),
  createImageTarget({
    id: 'subject-korean',
    exportKey: 'overview-score-chart',
    fileName: '국어.png',
    params: { tab: 'overview', subjects: '국어-화작,국어-언매' }
  }),
  createImageTarget({
    id: 'subject-hwajak',
    exportKey: 'overview-score-chart',
    fileName: '화작.png',
    params: { tab: 'overview', subjects: '국어-화작' }
  }),
  createImageTarget({
    id: 'subject-unmae',
    exportKey: 'overview-score-chart',
    fileName: '언매.png',
    params: { tab: 'overview', subjects: '국어-언매' }
  }),
  createImageTarget({
    id: 'subject-math',
    exportKey: 'overview-score-chart',
    fileName: '수학.png',
    params: { tab: 'overview', subjects: '수학-확통,수학-미적,수학-기하' }
  }),
  createImageTarget({
    id: 'subject-hwakton',
    exportKey: 'overview-score-chart',
    fileName: '확통.png',
    params: { tab: 'overview', subjects: '수학-확통' }
  }),
  createImageTarget({
    id: 'subject-mijeok',
    exportKey: 'overview-score-chart',
    fileName: '미적.png',
    params: { tab: 'overview', subjects: '수학-미적' }
  }),
  createImageTarget({
    id: 'subject-giha',
    exportKey: 'overview-score-chart',
    fileName: '기하.png',
    params: { tab: 'overview', subjects: '수학-기하' }
  }),
  createImageTarget({
    id: 'subject-english',
    exportKey: 'overview-score-chart',
    fileName: '영어.png',
    params: { tab: 'overview', subjects: '영어' }
  }),
  createImageTarget({
    id: 'subject-history',
    exportKey: 'overview-score-chart',
    fileName: '한국사.png',
    params: { tab: 'overview', subjects: '한국사' }
  }),
  createImageTarget({
    id: 'subject-physics1',
    exportKey: 'overview-score-chart',
    fileName: '물리1.png',
    params: { tab: 'overview', subjects: '탐구-물리1' }
  }),
  createImageTarget({
    id: 'subject-chemistry1',
    exportKey: 'overview-score-chart',
    fileName: '화학1.png',
    params: { tab: 'overview', subjects: '탐구-화학1' }
  }),
  createImageTarget({
    id: 'subject-biology1',
    exportKey: 'overview-score-chart',
    fileName: '생명1.png',
    params: { tab: 'overview', subjects: '탐구-생명1' }
  }),
  createImageTarget({
    id: 'subject-society',
    exportKey: 'overview-score-chart',
    fileName: '사회문화.png',
    params: { tab: 'overview', subjects: '탐구-사회문화' }
  }),
  createImageTarget({
    id: 'heatmap-korean-common',
    exportKey: 'question-heatmap',
    fileName: '정오표_국어.png',
    params: { tab: 'subjects', selectedSubject: '국어', selectedSection: '공통' }
  }),
  createImageTarget({
    id: 'heatmap-hwajak',
    exportKey: 'question-heatmap',
    fileName: '정오표_화작.png',
    params: { tab: 'subjects', selectedSubject: '국어', selectedSection: '화작' }
  }),
  createImageTarget({
    id: 'heatmap-unmae',
    exportKey: 'question-heatmap',
    fileName: '정오표_언매.png',
    params: { tab: 'subjects', selectedSubject: '국어', selectedSection: '언매' }
  }),
  createImageTarget({
    id: 'heatmap-math-common',
    exportKey: 'question-heatmap',
    fileName: '정오표_수학.png',
    params: { tab: 'subjects', selectedSubject: '수학', selectedSection: '공통' }
  }),
  createImageTarget({
    id: 'heatmap-hwakton',
    exportKey: 'question-heatmap',
    fileName: '정오표_확통.png',
    params: { tab: 'subjects', selectedSubject: '수학', selectedSection: '확통' }
  }),
  createImageTarget({
    id: 'heatmap-mijeok',
    exportKey: 'question-heatmap',
    fileName: '정오표_미적.png',
    params: { tab: 'subjects', selectedSubject: '수학', selectedSection: '미적' }
  }),
  createImageTarget({
    id: 'heatmap-giha',
    exportKey: 'question-heatmap',
    fileName: '정오표_기하.png',
    params: { tab: 'subjects', selectedSubject: '수학', selectedSection: '기하' }
  }),
  createImageTarget({
    id: 'heatmap-english',
    exportKey: 'question-heatmap',
    fileName: '정오표_영어.png',
    params: { tab: 'subjects', selectedSubject: '영어', selectedSection: '영어' }
  }),
  createImageTarget({
    id: 'heatmap-history',
    exportKey: 'question-heatmap',
    fileName: '정오표_한국사.png',
    params: { tab: 'subjects', selectedSubject: '한국사', selectedSection: '한국사' }
  }),
  createImageTarget({
    id: 'heatmap-physics1',
    exportKey: 'question-heatmap',
    fileName: '정오표_물리1.png',
    params: { tab: 'subjects', selectedSubject: '탐구', selectedSection: '물리1' }
  }),
  createImageTarget({
    id: 'heatmap-chemistry1',
    exportKey: 'question-heatmap',
    fileName: '정오표_화학1.png',
    params: { tab: 'subjects', selectedSubject: '탐구', selectedSection: '화학1' }
  }),
  createImageTarget({
    id: 'heatmap-biology1',
    exportKey: 'question-heatmap',
    fileName: '정오표_생명1.png',
    params: { tab: 'subjects', selectedSubject: '탐구', selectedSection: '생명1' }
  }),
  createImageTarget({
    id: 'heatmap-society',
    exportKey: 'question-heatmap',
    fileName: '정오표_사회문화.png',
    params: { tab: 'subjects', selectedSubject: '탐구', selectedSection: '사회문화' }
  }),
  createImageTarget({
    id: 'cost-analysis',
    exportKey: 'cost-scatter',
    fileName: '비용_분석.png',
    params: { tab: 'cost' }
  }),
  createImageTarget({
    id: 'token-usage',
    exportKey: 'token-usage',
    fileName: '토큰_사용량.png',
    params: { tab: 'cost' }
  })
]

export function getExportTargetById(id) {
  return EXPORT_TARGETS.find(target => target.id === id) || null
}
