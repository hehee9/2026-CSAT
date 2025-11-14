"""
2026 수능 LLM 풀이 결과 차트 생성 스크립트

완전 자동화된 범용 차트 생성기:
- 엑셀 파일의 모든 시트를 자동 감지
- 과목/선택과목 자동 파싱
- 새로운 과목 추가 시 코드 수정 불필요

사용법:
    python generate_charts.py                    # 모든 차트 생성
    python generate_charts.py --subjects 국어    # 특정 과목만
    python generate_charts.py --mode summary     # 종합 차트만
    python generate_charts.py --list             # 사용 가능한 과목 목록 확인
"""

import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import argparse
import os
from collections import defaultdict

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False


class ChartConfig:
    """차트 설정 클래스"""

    # 색상 팔레트
    SUBJECT_COLORS = {
        '공통': '#34A853',
        '선택1': '#FBBC04',
        '선택2': '#EA4335',
        '선택3': '#9C27B0',
        '선택4': '#4285F4',
    }

    GPT_COLOR = '#EA4335'      # OpenAI - 빨간색
    GEMINI_COLOR = '#4285F4'    # Gemini - 파란색

    @staticmethod
    def get_model_colors(models):
        """모델별 색상 반환"""
        colors = []
        for model in models:
            if 'GPT' in model or 'gpt' in model.lower():
                colors.append(ChartConfig.GPT_COLOR)
            elif 'Gemini' in model or 'gemini' in model.lower():
                colors.append(ChartConfig.GEMINI_COLOR)
            else:
                colors.append('#666666')
        return colors


class DataLoader:
    """데이터 로더 클래스"""

    def __init__(self, excel_path):
        self.excel_path = excel_path
        self.excel_file = pd.ExcelFile(excel_path)

    def get_all_sheets(self):
        """모든 시트 이름 반환"""
        return self.excel_file.sheet_names

    def parse_sheet_name(self, sheet_name):
        """시트 이름 파싱 (예: '국어-공통' -> ('국어', '공통'), '영어' -> ('영어', '전체'))"""
        if '-' in sheet_name:
            parts = sheet_name.split('-', 1)
            return parts[0].strip(), parts[1].strip()
        # 단일 시트인 경우 (예: 영어)
        return sheet_name.strip(), '전체'

    def get_subjects(self):
        """과목 목록 반환"""
        subjects = set()
        for sheet in self.get_all_sheets():
            subject, _ = self.parse_sheet_name(sheet)
            if subject:
                subjects.add(subject)
        return sorted(list(subjects))

    def get_subject_sheets(self, subject):
        """특정 과목의 모든 시트 반환"""
        sheets = []
        for sheet in self.get_all_sheets():
            subj, part = self.parse_sheet_name(sheet)
            if subj == subject:
                sheets.append((sheet, part))
        return sheets

    def load_scores(self, sheet_name):
        """시트에서 점수 로드 (모델 자동 감지)"""
        df = pd.read_excel(self.excel_path, sheet_name=sheet_name)

        # 헤더 행 찾기
        header_row_idx = None
        for idx in range(min(5, len(df))):
            if '문항 번호' in str(df.iloc[idx, 0]):
                header_row_idx = idx
                break

        if header_row_idx is None:
            raise ValueError(f"'{sheet_name}' 시트에서 헤더를 찾을 수 없습니다.")

        # 데이터 정리
        headers = df.iloc[header_row_idx].values
        df_clean = df.iloc[header_row_idx+1:].copy()
        df_clean.columns = headers

        # 총점 행 찾기
        score_row = df_clean[df_clean['문항 번호'].isin(['총점', '총합', '점수'])]

        if len(score_row) == 0:
            raise ValueError(f"'{sheet_name}' 시트에서 총점 행을 찾을 수 없습니다.")

        # 모델별 점수 추출 (자동 감지)
        # '문항 번호'와 '정답'을 제외한 모든 컬럼이 모델명
        scores = {}
        for col in df_clean.columns:
            col_str = str(col).strip()
            # 불필요한 컬럼 제외
            if col_str in ['문항 번호', '정답', 'nan', '']:
                continue
            # Unnamed 컬럼 제외
            if 'Unnamed' in col_str:
                continue

            try:
                score = score_row[col].values[0]
                if pd.notna(score):
                    scores[col_str] = int(score)
            except:
                pass

        return scores

    def get_max_score(self, sheet_name):
        """만점 추출"""
        df = pd.read_excel(self.excel_path, sheet_name=sheet_name)

        # 헤더 행 찾기
        for idx in range(min(5, len(df))):
            if '문항 번호' in str(df.iloc[idx, 0]):
                headers = df.iloc[idx].values
                df_clean = df.iloc[idx+1:].copy()
                df_clean.columns = headers

                score_row = df_clean[df_clean['문항 번호'].isin(['총점', '총합', '점수'])]
                if len(score_row) > 0 and '정답' in df_clean.columns:
                    try:
                        return int(score_row['정답'].values[0])
                    except:
                        pass

        return 100  # 기본값


class ChartGenerator:
    """차트 생성기 클래스"""

    def __init__(self, data_loader, output_dir='images'):
        self.loader = data_loader
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _get_filename_safe(self, text):
        """파일명으로 안전한 문자열 변환"""
        replacements = {
            '확률과 통계': 'hwakton',
            '미적분': 'calculus',
            '기하': 'geometry',
            '화법과 작문': 'hwajak',
            '언어와 매체': 'unmae',
            '공통': 'common',
        }
        return replacements.get(text, text.replace(' ', '_').replace('/', '_'))

    def create_summary_chart(self, subject, option_parts, title_suffix=''):
        """종합 성적 차트 생성"""
        # 각 파트별 점수 로드 및 만점 계산
        all_scores = {}
        model_names = None
        total_max_score = 0

        for sheet_name, part in option_parts:
            scores = self.loader.load_scores(sheet_name)
            max_score = self.loader.get_max_score(sheet_name)
            total_max_score += max_score

            if model_names is None:
                model_names = list(scores.keys())

            for model in model_names:
                if model not in all_scores:
                    all_scores[model] = 0
                all_scores[model] += scores.get(model, 0)

        # 총점 계산
        total_scores = [all_scores[model] for model in model_names]

        # 모델명 짧게 변환
        model_short = [name.replace(' ', '\n') if len(name) > 10 else name for name in model_names]

        # 차트 생성
        fig, ax = plt.subplots(figsize=(12, 6))
        x = np.arange(len(model_names))
        colors = ChartConfig.get_model_colors(model_names)
        bars = ax.bar(x, total_scores, color=colors, alpha=0.8)

        # 제목 생성
        parts_str = ' + '.join([part for _, part in option_parts])
        title = f'2026 수능 {subject} 영역 LLM 모델별 성적 비교 ({parts_str})'
        if title_suffix:
            title += f' {title_suffix}'

        ax.set_ylabel('점수 (점)', fontsize=12, fontweight='bold')
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        ax.set_xticks(x)
        ax.set_xticklabels(model_short, fontsize=10)
        ax.set_ylim(0, max(total_scores) * 1.15)
        ax.axhline(y=total_max_score, color='gray', linestyle='--', linewidth=1, alpha=0.5, label=f'만점 ({total_max_score}점)')
        ax.grid(axis='y', alpha=0.3)
        ax.legend(fontsize=10)

        # 점수 표시
        for i, (bar, score) in enumerate(zip(bars, total_scores)):
            color = 'red' if score == total_max_score else 'black'
            ax.text(bar.get_x() + bar.get_width()/2., score + 1.5,
                    f'{score}점', ha='center', va='bottom', fontsize=11, fontweight='bold', color=color)

        plt.tight_layout()

        # 파일명 생성
        option_name = '_'.join([self._get_filename_safe(part) for _, part in option_parts])
        filename = f'{subject.lower()}_score_{option_name}.png'
        filepath = os.path.join(self.output_dir, filename)

        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')
        return filepath

    def create_breakdown_chart(self, subject, common_sheet, select_sheet):
        """영역별 분포 차트 생성 (Stacked Bar)"""
        # 점수 로드
        common_scores_dict = self.loader.load_scores(common_sheet[0])
        select_scores_dict = self.loader.load_scores(select_sheet[0])

        model_names = list(common_scores_dict.keys())
        common_scores = [common_scores_dict[m] for m in model_names]
        select_scores = [select_scores_dict[m] for m in model_names]

        # 만점 정보
        common_max = self.loader.get_max_score(common_sheet[0])
        select_max = self.loader.get_max_score(select_sheet[0])

        # 모델명 짧게 변환
        model_short = [name.replace(' ', '\n') if len(name) > 10 else name for name in model_names]

        # 차트 생성
        fig, ax = plt.subplots(figsize=(12, 6))
        x = np.arange(len(model_names))

        bars1 = ax.bar(x, common_scores, label=f'{common_sheet[1]} ({common_max}점)',
                       color=ChartConfig.SUBJECT_COLORS['공통'])
        bars2 = ax.bar(x, select_scores, bottom=common_scores,
                       label=f'{select_sheet[1]} ({select_max}점)',
                       color=ChartConfig.SUBJECT_COLORS['선택1'])

        title = f'2026 수능 {subject} 영역별 점수 분포 ({select_sheet[1]})'

        ax.set_ylabel('점수 (점)', fontsize=12, fontweight='bold')
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        ax.set_xticks(x)
        ax.set_xticklabels(model_short, fontsize=10)
        ax.set_ylim(0, 110)
        ax.legend(fontsize=11, loc='upper right')
        ax.grid(axis='y', alpha=0.3)

        # 총점 표시
        for i, (score_c, score_s) in enumerate(zip(common_scores, select_scores)):
            total = score_c + score_s
            color = 'red' if total == 100 else 'black'
            ax.text(i, total + 1.5, f'{total}점', ha='center', va='bottom',
                    fontsize=10, fontweight='bold', color=color)

        plt.tight_layout()

        # 파일명 생성
        option_name = self._get_filename_safe(select_sheet[1])
        filename = f'{subject.lower()}_breakdown_{option_name}.png'
        filepath = os.path.join(self.output_dir, filename)

        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')
        return filepath

    def generate_for_subject(self, subject, mode='all'):
        """특정 과목의 모든 차트 생성"""
        print(f'\n[{subject} 영역]')

        sheets = self.loader.get_subject_sheets(subject)

        # 단일 시트 과목 처리 (예: 영어)
        if len(sheets) == 1 and sheets[0][1] == '전체':
            if mode in ['summary', 'all']:
                self.create_summary_chart(subject, [sheets[0]])
            print(f'  ℹ 단일 시트 과목 - breakdown 차트는 생성하지 않습니다')
            return

        # 공통/선택 분류
        common_sheet = None
        select_sheets = []

        for sheet_name, part in sheets:
            if part == '공통':
                common_sheet = (sheet_name, part)
            else:
                select_sheets.append((sheet_name, part))

        if not common_sheet:
            print(f'  ⚠ 공통 시트를 찾을 수 없습니다.')
            return

        # 종합 차트 생성
        if mode in ['summary', 'all']:
            for select_sheet in select_sheets:
                self.create_summary_chart(subject, [common_sheet, select_sheet])

        # 영역별 차트 생성
        if mode in ['breakdown', 'all']:
            for select_sheet in select_sheets:
                self.create_breakdown_chart(subject, common_sheet, select_sheet)


def list_subjects(excel_path):
    """사용 가능한 과목 목록 출력"""
    loader = DataLoader(excel_path)
    subjects = loader.get_subjects()

    print('\n사용 가능한 과목:')
    for subject in subjects:
        sheets = loader.get_subject_sheets(subject)
        parts = [part for _, part in sheets]
        print(f'  • {subject}: {", ".join(parts)}')
    print()


def main():
    parser = argparse.ArgumentParser(
        description='2026 수능 LLM 풀이 결과 차트 생성 (완전 자동화)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python generate_charts.py                       # 모든 차트 생성
  python generate_charts.py --subjects 국어       # 국어만
  python generate_charts.py --subjects 국어 수학  # 국어, 수학만
  python generate_charts.py --mode summary        # 종합 차트만
  python generate_charts.py --list                # 과목 목록 확인
        """
    )

    parser.add_argument('--subjects', nargs='+',
                        help='생성할 과목 (생략 시 전체)')
    parser.add_argument('--mode', choices=['summary', 'breakdown', 'all'], default='all',
                        help='차트 종류 (기본값: all)')
    parser.add_argument('--excel', default='2026 수능 LLM 풀이.xlsx',
                        help='엑셀 파일 경로')
    parser.add_argument('--output', default='images',
                        help='출력 디렉토리')
    parser.add_argument('--list', action='store_true',
                        help='사용 가능한 과목 목록 출력')

    args = parser.parse_args()

    # 과목 목록 출력
    if args.list:
        list_subjects(args.excel)
        return

    # 차트 생성
    print(f'\n{"="*60}')
    print(f'차트 생성 시작: {args.mode} 모드')
    print(f'{"="*60}')

    loader = DataLoader(args.excel)
    generator = ChartGenerator(loader, args.output)

    # 생성할 과목 결정
    if args.subjects:
        subjects = args.subjects
    else:
        subjects = loader.get_subjects()

    # 각 과목별 차트 생성
    for subject in subjects:
        try:
            generator.generate_for_subject(subject, args.mode)
        except Exception as e:
            print(f'  ✗ {subject} 차트 생성 실패: {e}')

    print(f'\n{"="*60}')
    print('✅ 차트 생성 완료!')
    print(f'{"="*60}\n')


if __name__ == '__main__':
    main()
