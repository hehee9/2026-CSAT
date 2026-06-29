import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')
const imagesDir = path.join(repoRoot, 'docs', 'images')
export const EXPORT_GROUP_ORDER = ['overview', 'subjects', 'cost']

function createImageTarget({ id, group, exportKey, fileName, params }) {
  return {
    id,
    group,
    exportKey,
    outputPath: path.join(imagesDir, fileName),
    params: {
      theme: 'light',
      ...params
    }
  }
}

/** @description Create a hard-mode subject score export target */
function createHardSubjectTarget({ id, fileName, subjects }) {
  return createImageTarget({
    id: `hard-${id}`,
    group: 'subjects',
    exportKey: 'overview-score-chart',
    fileName: `고난도_${fileName}`,
    params: {
      mode: 'hard',
      tab: 'overview',
      subjects
    }
  })
}

export const EXPORT_TARGETS = [
  createImageTarget({
    id: 'overview-total',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '전체.png',
    params: { tab: 'overview', scoreView: 'average' }
  }),
  createImageTarget({
    id: 'overview-best-worst',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '최고_최저.png',
    params: { tab: 'overview', scoreView: 'bestWorst' }
  }),
  createImageTarget({
    id: 'overview-with-image',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '이미지O.png',
    params: { tab: 'overview', scoreView: 'withImage' }
  }),
  createImageTarget({
    id: 'overview-without-image',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '이미지X.png',
    params: { tab: 'overview', scoreView: 'withoutImage' }
  }),
  createImageTarget({
    id: 'subject-korean',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '국어.png',
    params: { tab: 'overview', subjects: '국어-화작,국어-언매' }
  }),
  createImageTarget({
    id: 'subject-math',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '수학.png',
    params: { tab: 'overview', subjects: '수학-확통,수학-미적,수학-기하' }
  }),
  createImageTarget({
    id: 'subject-english',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '영어.png',
    params: { tab: 'overview', subjects: '영어' }
  }),
  createImageTarget({
    id: 'subject-history',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '한국사.png',
    params: { tab: 'overview', subjects: '한국사' }
  }),
  createImageTarget({
    id: 'subject-physics1',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '물리1.png',
    params: { tab: 'overview', subjects: '탐구-물리1' }
  }),
  createImageTarget({
    id: 'subject-chemistry1',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '화학1.png',
    params: { tab: 'overview', subjects: '탐구-화학1' }
  }),
  createImageTarget({
    id: 'subject-biology1',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '생명1.png',
    params: { tab: 'overview', subjects: '탐구-생명1' }
  }),
  createImageTarget({
    id: 'subject-society',
    group: 'overview',
    exportKey: 'overview-score-chart',
    fileName: '사회문화.png',
    params: { tab: 'overview', subjects: '탐구-사회문화' }
  }),
  createHardSubjectTarget({
    id: 'subject-korean',
    fileName: '국어.png',
    subjects: '국어-화작,국어-언매'
  }),
  createHardSubjectTarget({
    id: 'subject-math',
    fileName: '수학.png',
    subjects: '수학-확통,수학-미적,수학-기하'
  }),
  createHardSubjectTarget({
    id: 'subject-english',
    fileName: '영어.png',
    subjects: '영어'
  }),
  createHardSubjectTarget({
    id: 'subject-history',
    fileName: '한국사.png',
    subjects: '한국사'
  }),
  createHardSubjectTarget({
    id: 'subject-physics1',
    fileName: '물리1.png',
    subjects: '탐구-물리1'
  }),
  createHardSubjectTarget({
    id: 'subject-chemistry1',
    fileName: '화학1.png',
    subjects: '탐구-화학1'
  }),
  createHardSubjectTarget({
    id: 'subject-biology1',
    fileName: '생명1.png',
    subjects: '탐구-생명1'
  }),
  createHardSubjectTarget({
    id: 'subject-society',
    fileName: '사회문화.png',
    subjects: '탐구-사회문화'
  }),
  createImageTarget({
    id: 'cost-analysis',
    group: 'cost',
    exportKey: 'cost-scatter',
    fileName: '비용_분석.png',
    params: { tab: 'cost' }
  }),
  createImageTarget({
    id: 'token-usage',
    group: 'cost',
    exportKey: 'token-usage',
    fileName: '토큰_사용량.png',
    params: { tab: 'cost' }
  })
]

export function getExportTargetById(id) {
  return EXPORT_TARGETS.find(target => target.id === id) || null
}

export function getExportTargetsByGroup(group) {
  return EXPORT_TARGETS.filter(target => target.group === group)
}
