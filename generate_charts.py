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
    CLAUDE_COLOR = '#D2691E'    # Claude - 주황색~갈색 (Chocolate)
    GROK_COLOR = '#6A4C93'      # Grok - 약간 어두운 보라색
    DEEPSEEK_COLOR = '#1E3A8A'  # DeepSeek - Gemini보다 어두운 파란색

    @staticmethod
    def get_model_colors(models):
        """모델별 색상 반환"""
        colors = []
        for model in models:
            if 'GPT' in model or 'gpt' in model.lower():
                colors.append(ChartConfig.GPT_COLOR)
            elif 'Gemini' in model or 'gemini' in model.lower():
                colors.append(ChartConfig.GEMINI_COLOR)
            elif 'Claude' in model or 'claude' in model.lower():
                colors.append(ChartConfig.CLAUDE_COLOR)
            elif 'Grok' in model or 'grok' in model.lower():
                colors.append(ChartConfig.GROK_COLOR)
            elif 'DeepSeek' in model or 'deepseek' in model.lower():
                colors.append(ChartConfig.DEEPSEEK_COLOR)
            else:
                colors.append('#666666')
        return colors

    @staticmethod
    def lighten_color(hex_color, factor=0.5):
        """색상을 밝게 조정 (factor: 0=원색, 1=흰색)"""
        # hex를 RGB로 변환
        hex_color = hex_color.lstrip('#')
        r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)

        # 밝게 조정 (흰색 방향으로)
        r = int(r + (255 - r) * factor)
        g = int(g + (255 - g) * factor)
        b = int(b + (255 - b) * factor)

        return f'#{r:02x}{g:02x}{b:02x}'


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

    def create_summary_chart(self, subject, option_parts, title_suffix='', sort_by='name'):
        """종합 성적 차트 생성

        Args:
            subject: 과목명
            option_parts: [(sheet_name, part), ...] 리스트
            title_suffix: 제목 추가 텍스트
            sort_by: 정렬 방식 ('name' = 모델명순, 'score' = 성적순)
        """
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

        # 정렬 방식에 따라 정렬
        if sort_by == 'score':
            # 성적순 (내림차순)
            sorted_items = sorted(all_scores.items(), key=lambda x: x[1], reverse=True)
            model_names = [item[0] for item in sorted_items]
        # else: sort_by == 'name' -> 기존 순서 유지 (엑셀 컬럼 순서)

        # 총점 계산
        total_scores = [all_scores[model] for model in model_names]

        # 동적 폭 계산: 모델 수에 따라 조정 (절반으로 축소)
        num_models = len(model_names)
        fig_width = max(6, min(12, 5 + num_models * 0.4))  # 절반 크기

        # 차트 생성
        fig, ax = plt.subplots(figsize=(fig_width, 5))
        # 막대 간격 조정 (0.75로 증가)
        x = np.arange(len(model_names)) * 0.75
        colors = ChartConfig.get_model_colors(model_names)

        # 막대 폭 절반 크기 유지
        bar_width = max(0.2, min(0.4, 0.5 - num_models * 0.01))
        # 수정된 부분 1: edgecolor와 linewidth를 추가하여 막대에 테두리 적용
        bars = ax.bar(x, total_scores, width=bar_width, color=colors, alpha=0.8, edgecolor='black', linewidth=0.5)

        # 제목 생성
        parts_str = ' + '.join([part for _, part in option_parts])
        title = f'2026 수능 {subject} 영역 LLM 모델별 성적 비교 ({parts_str})'
        if title_suffix:
            title += f' {title_suffix}'

        ax.set_ylabel('점수 (점)', fontsize=12, fontweight='bold')
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        ax.set_xticks(x)
        ax.set_xticklabels(model_names, fontsize=10, rotation=45, ha='right')  # 45도 회전
        ax.set_ylim(0, max(total_scores) * 1.15)
        ax.axhline(y=total_max_score, color='gray', linestyle='--', linewidth=1, alpha=0.5, label=f'만점 ({total_max_score}점)')
        ax.grid(axis='y', alpha=0.3)
        ax.legend(fontsize=10)

        # 점수 표시
        for i, (bar, score) in enumerate(zip(bars, total_scores)):
            color = 'red' if score == total_max_score else 'black'
            # 수정된 부분 2: f-string에서 '점' 텍스트 제거
            ax.text(bar.get_x() + bar.get_width()/2., score + 1.5,
                    f'{score}', ha='center', va='bottom', fontsize=11, fontweight='bold', color=color)

        plt.tight_layout()

        # 파일명 생성
        option_name = '_'.join([self._get_filename_safe(part) for _, part in option_parts])
        sort_suffix = '_by_score' if sort_by == 'score' else '_by_name'
        filename = f'{subject.lower()}_score_{option_name}{sort_suffix}.png'
        filepath = os.path.join(self.output_dir, filename)

        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')
        return filepath

    def create_breakdown_chart(self, subject, common_sheet, select_sheet, sort_by='name'):
        """영역별 분포 차트 생성 (Stacked Bar)

        Args:
            subject: 과목명
            common_sheet: 공통 영역 시트 정보
            select_sheet: 선택 영역 시트 정보
            sort_by: 정렬 방식 ('name' = 모델명순, 'score' = 성적순)
        """
        # 점수 로드
        common_scores_dict = self.loader.load_scores(common_sheet[0])
        select_scores_dict = self.loader.load_scores(select_sheet[0])

        model_names = list(common_scores_dict.keys())

        # 정렬 방식에 따라 정렬
        if sort_by == 'score':
            # 총점 기준 성적순 (내림차순)
            total_scores_dict = {m: common_scores_dict[m] + select_scores_dict[m] for m in model_names}
            sorted_items = sorted(total_scores_dict.items(), key=lambda x: x[1], reverse=True)
            model_names = [item[0] for item in sorted_items]
        # else: sort_by == 'name' -> 기존 순서 유지 (엑셀 컬럼 순서)

        common_scores = [common_scores_dict[m] for m in model_names]
        select_scores = [select_scores_dict[m] for m in model_names]

        # 만점 정보
        common_max = self.loader.get_max_score(common_sheet[0])
        select_max = self.loader.get_max_score(select_sheet[0])

        # 동적 폭 계산 (절반으로 축소)
        num_models = len(model_names)
        fig_width = max(6, min(12, 5 + num_models * 0.4))  # 절반 크기

        # 차트 생성
        fig, ax = plt.subplots(figsize=(fig_width, 5))
        # 막대 간격 조정 (0.75로 증가)
        x = np.arange(len(model_names)) * 0.75

        # 막대 폭 절반 크기 유지
        bar_width = max(0.2, min(0.4, 0.5 - num_models * 0.01))

        # 제작사별 컬러링
        common_colors = ChartConfig.get_model_colors(model_names)
        select_colors = [ChartConfig.lighten_color(c, 0.5) for c in common_colors]

        bars1 = ax.bar(x, common_scores, width=bar_width, label='공통 영역',
                       color=common_colors, edgecolor='black', linewidth=0.5)
        bars2 = ax.bar(x, select_scores, width=bar_width, bottom=common_scores,
                       label='선택 영역',
                       color=select_colors, edgecolor='black', linewidth=0.5)

        title = f'2026 수능 {subject} 영역별 점수 분포 ({select_sheet[1]})'

        ax.set_ylabel('점수 (점)', fontsize=12, fontweight='bold')
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        ax.set_xticks(x)
        ax.set_xticklabels(model_names, fontsize=10, rotation=45, ha='right')  # 45도 회전
        ax.set_ylim(0, 115)  # 상단 여백 증가 (110 -> 115)
        # 범례를 우상단 유지하되 그래프 박스 위로 완전히 빼내기
        ax.legend(fontsize=11, loc='lower right', bbox_to_anchor=(1.0, 1.02), frameon=True)
        ax.grid(axis='y', alpha=0.3)

        # 총점 표시
        for i, (score_c, score_s) in enumerate(zip(common_scores, select_scores)):
            total = score_c + score_s
            color = 'red' if total == 100 else 'black'
            # 수정된 부분: f-string에서 '점' 텍스트 제거
            ax.text(x[i], total + 1.5, f'{total}', ha='center', va='bottom',
                    fontsize=10, fontweight='bold', color=color)

        plt.tight_layout()

        # 파일명 생성
        option_name = self._get_filename_safe(select_sheet[1])
        sort_suffix = '_by_score' if sort_by == 'score' else '_by_name'
        filename = f'{subject.lower()}_breakdown_{option_name}{sort_suffix}.png'
        filepath = os.path.join(self.output_dir, filename)

        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')
        return filepath

    def create_elective_average_chart(self, subject, common_sheet, select_sheets, sort_by='name'):
        """선택과목 평균을 사용한 영역별 분포 차트 생성 (Stacked Bar)

        Args:
            subject: 과목명
            common_sheet: 공통 영역 시트 정보
            select_sheets: 선택 영역 시트 정보 리스트
            sort_by: 정렬 방식 ('name' = 모델명순, 'score' = 성적순)
        """
        # 공통 점수 로드
        common_scores_dict = self.loader.load_scores(common_sheet[0])
        model_names = list(common_scores_dict.keys())

        # 각 모델별 선택과목 평균 점수 계산
        model_select_avg = defaultdict(float)
        for select_sheet_name, _ in select_sheets:
            select_scores = self.loader.load_scores(select_sheet_name)
            for model, score in select_scores.items():
                model_select_avg[model] += score
        
        num_selects = len(select_sheets)
        if num_selects > 0:
            for model in model_select_avg.keys():
                model_select_avg[model] /= num_selects

        # 정렬 방식에 따라 정렬
        if sort_by == 'score':
            # 총점(공통+선택평균) 기준 성적순 (내림차순)
            total_scores_dict = {m: common_scores_dict.get(m, 0) + model_select_avg.get(m, 0) for m in model_names}
            sorted_items = sorted(total_scores_dict.items(), key=lambda x: x[1], reverse=True)
            model_names = [item[0] for item in sorted_items]

        common_scores = [common_scores_dict.get(m, 0) for m in model_names]
        select_avg_scores = [model_select_avg.get(m, 0) for m in model_names]

        # 동적 폭 계산
        num_models = len(model_names)
        fig_width = max(6, min(12, 5 + num_models * 0.4))

        # 차트 생성
        fig, ax = plt.subplots(figsize=(fig_width, 5))
        x = np.arange(len(model_names)) * 0.75
        bar_width = max(0.2, min(0.4, 0.5 - num_models * 0.01))

        # 제작사별 컬러링
        common_colors = ChartConfig.get_model_colors(model_names)
        select_colors = [ChartConfig.lighten_color(c, 0.5) for c in common_colors]

        ax.bar(x, common_scores, width=bar_width, label='공통 영역',
               color=common_colors, edgecolor='black', linewidth=0.5)
        ax.bar(x, select_avg_scores, width=bar_width, bottom=common_scores,
               label='선택 영역 (평균)',
               color=select_colors, edgecolor='black', linewidth=0.5)

        title = f'2026 수능 {subject} 영역별 점수 분포 (선택과목 평균)'

        ax.set_ylabel('점수 (점)', fontsize=12, fontweight='bold')
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        ax.set_xticks(x)
        ax.set_xticklabels(model_names, fontsize=10, rotation=45, ha='right')
        ax.set_ylim(0, 115)
        ax.legend(fontsize=11, loc='lower right', bbox_to_anchor=(1.0, 1.02), frameon=True)
        ax.grid(axis='y', alpha=0.3)

        # 총점 표시 (소수점 처리 포함)
        for i, (score_c, score_s_avg) in enumerate(zip(common_scores, select_avg_scores)):
            total = score_c + score_s_avg
            color = 'red' if total == 100 else 'black'
            
            # 소수점 1자리까지 표기 (정수면 정수로)
            score_text = f'{total:.1f}' if total % 1 != 0 else f'{int(total)}'
            
            ax.text(x[i], total + 1.5, score_text, ha='center', va='bottom',
                    fontsize=10, fontweight='bold', color=color)

        plt.tight_layout()

        # 파일명 생성
        sort_suffix = '_by_score' if sort_by == 'score' else '_by_name'
        filename = f'{subject.lower()}_average_breakdown{sort_suffix}.png'
        filepath = os.path.join(self.output_dir, filename)

        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')
        return filepath

    def generate_for_subject(self, subject, mode='all'):
        """특정 과목의 모든 차트 생성"""
        print(f'\n[{subject} 영역]')

        sheets = self.loader.get_subject_sheets(subject)

        # 단일 시트 과목 처리 (예: 영어, 한국사)
        if len(sheets) == 1 and sheets[0][1] == '전체':
            if mode in ['summary', 'all']:
                # 모델명순/성적순 차트 각각 생성
                self.create_summary_chart(subject, [sheets[0]], sort_by='name')
                self.create_summary_chart(subject, [sheets[0]], sort_by='score')
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

        # 국어/수학의 경우 공통+선택 조합의 summary 차트는 생성하지 않음
        # (breakdown만 유지)

        # 선택과목이 2개 이상일 때만 선택과목 평균 차트 생성
        if len(select_sheets) > 1 and mode in ['breakdown', 'all']:
            self.create_elective_average_chart(subject, common_sheet, select_sheets, sort_by='name')
            self.create_elective_average_chart(subject, common_sheet, select_sheets, sort_by='score')

        # 개별 선택과목 breakdown 차트 생성
        if mode in ['breakdown', 'all']:
            for select_sheet in select_sheets:
                self.create_breakdown_chart(subject, common_sheet, select_sheet, sort_by='name')
                self.create_breakdown_chart(subject, common_sheet, select_sheet, sort_by='score')

    def create_subject_model_comparison_chart(self):
        """과목-모델별 상세 비교 차트 생성 (세로 막대)"""
        print('\n[과목-모델별 상세 비교]')

        subjects = self.loader.get_subjects()

        # 데이터 수집: 과목별로 그룹화
        subject_data = []  # [(subject_name, [(model, score), ...]), ...]

        for subject in subjects:
            sheets = self.loader.get_subject_sheets(subject)

            # 단일 시트 과목 (예: 영어, 한국사)
            if len(sheets) == 1 and sheets[0][1] == '전체':
                scores = self.loader.load_scores(sheets[0][0])
                max_score_val = self.loader.get_max_score(sheets[0][0])

                model_scores = [(model, score) for model, score in scores.items()]
                subject_data.append((subject, model_scores, max_score_val))

            # 공통+선택 과목 (국어, 수학) - 선택과목 평균 사용
            else:
                common_sheet = None
                select_sheets = []

                for sheet_name, part in sheets:
                    if part == '공통':
                        common_sheet = (sheet_name, part)
                    else:
                        select_sheets.append((sheet_name, part))

                if common_sheet and select_sheets:
                    common_scores = self.loader.load_scores(common_sheet[0])

                    # 각 모델별 선택과목 평균 계산
                    model_avg_scores = {}
                    for model in common_scores.keys():
                        select_total = 0
                        for select_sheet_name, select_part in select_sheets:
                            select_scores = self.loader.load_scores(select_sheet_name)
                            select_total += select_scores.get(model, 0)

                        # 공통 + 선택과목 평균
                        avg_score = common_scores[model] + (select_total / len(select_sheets))
                        model_avg_scores[model] = avg_score

                    model_scores = [(model, score) for model, score in model_avg_scores.items()]
                    subject_data.append((subject, model_scores, 100))

        # x축 위치 계산 (과목 간 간격 추가)
        bar_positions = []
        bar_labels = []
        bar_scores = []
        bar_colors = []
        subject_positions = []  # 과목명 표시 위치
        subject_names = []
        subject_max_scores = []  # 각 과목의 만점

        current_pos = 0
        gap_within_subject = 0.5  # 과목 내부 막대 간 간격 (절반으로 축소)
        gap_between_subjects = 1.0  # 과목 간 간격

        for subject, model_scores, max_score_val in subject_data:
            subject_start = current_pos

            for model, score in model_scores:
                bar_positions.append(current_pos)
                bar_labels.append(model)  # 긴 이름도 그대로 유지
                bar_scores.append(score)
                bar_colors.append(ChartConfig.get_model_colors([model])[0])
                current_pos += gap_within_subject

            # 과목명 표시 위치 (중앙)
            subject_center = (subject_start + current_pos - gap_within_subject) / 2
            subject_positions.append(subject_center)
            subject_names.append(subject)
            subject_max_scores.append(max_score_val)

            # 다음 과목을 위한 간격
            current_pos += gap_between_subjects

        # 전체 y축 최대값 계산 (가장 큰 만점 기준)
        max_y_limit = max(subject_max_scores) * 1.1

        # 동적 폭 계산 (전체 막대 수 기준)
        total_bars = len(bar_positions)
        fig_width = max(14, min(30, 12 + total_bars * 0.3))

        # 차트 생성
        fig, ax = plt.subplots(figsize=(fig_width, 7))
        bar_width = max(0.25, min(0.35, 0.5 - total_bars * 0.005))  # 막대 폭 동적 조정

        bars = ax.bar(bar_positions, bar_scores, width=bar_width, color=bar_colors,
                      alpha=0.85, edgecolor='black', linewidth=0.5)

        # 제목 및 라벨
        ax.set_ylabel('점수 (점)', fontsize=16, fontweight='bold')
        ax.set_title('2026 수능 과목-모델별 상세 성적 비교', fontsize=20, fontweight='bold', pad=20)
        ax.set_xticks(bar_positions)
        ax.set_xticklabels(bar_labels, fontsize=11, rotation=45, ha='right')  # 45도 회전
        ax.set_ylim(0, max_y_limit)

        # 과목별 만점선 표시 (100점과 50점)
        if 100 in subject_max_scores:
            ax.axhline(y=100, color='gray', linestyle='--', linewidth=1, alpha=0.5, label='만점 (100점)')
        if 50 in subject_max_scores:
            ax.axhline(y=50, color='orange', linestyle='--', linewidth=1, alpha=0.5, label='만점 (50점)')

        ax.grid(axis='y', alpha=0.3, linestyle='--')
        ax.legend(fontsize=12)

        # 점수 표시 - 과목별 만점 매핑
        # 각 막대의 인덱스로부터 과목 결정
        bars_per_subject = []
        idx = 0
        for subject, model_scores, max_score_val in subject_data:
            num_models = len(model_scores)
            bars_per_subject.append((idx, idx + num_models, max_score_val))
            idx += num_models

        for i, (bar, score) in enumerate(zip(bars, bar_scores)):
            # 현재 막대가 속한 과목의 만점 찾기
            current_max = 100
            for start_idx, end_idx, max_val in bars_per_subject:
                if start_idx <= i < end_idx:
                    current_max = max_val
                    break

            color = 'red' if score == current_max else 'black'
            score_text = f'{int(score)}' if score == int(score) else f'{score:.1f}'
            ax.text(bar.get_x() + bar.get_width()/2., score + max_y_limit * 0.015,
                    score_text, ha='center', va='bottom', fontsize=11, fontweight='bold', color=color)

        # 과목명 표시 (상단, 불투명하게)
        for pos, name in zip(subject_positions, subject_names):
            ax.text(pos, max_y_limit * 0.98, name, ha='center', va='bottom', fontsize=15,
                    fontweight='bold', bbox=dict(boxstyle='round,pad=0.5',
                    facecolor='white', alpha=1.0, edgecolor='black', linewidth=1.5))

        plt.tight_layout()

        # 파일 저장
        filename = 'subject_model_comparison.png'
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')
        print(f'  📊 총 {len(bar_positions)}개 항목, {len(subject_names)}개 과목')

        return filepath

    def create_overall_comparison_chart(self):
        """전과목 합산 비교 차트 생성"""
        print('\n[전과목 종합]')

        # 모든 과목의 점수 수집
        subjects = self.loader.get_subjects()
        model_total_scores = defaultdict(int)
        subject_details = {}  # 과목별 상세 정보

        for subject in subjects:
            sheets = self.loader.get_subject_sheets(subject)

            # 단일 시트 과목 (예: 영어, 한국사)
            if len(sheets) == 1 and sheets[0][1] == '전체':
                scores = self.loader.load_scores(sheets[0][0])
                # 수정된 부분 1: 유효한 점수 데이터가 없으면 해당 과목을 건너뜀
                if not scores:
                    print(f'  ℹ {subject} 과목에 유효한 점수 데이터가 없어 총점에서 제외합니다.')
                    continue
                
                max_score = self.loader.get_max_score(sheets[0][0])
                subject_details[subject] = {'max': max_score, 'type': 'single'}

                for model, score in scores.items():
                    model_total_scores[model] += score

            # 공통+선택 과목 (국어, 수학)
            else:
                common_sheet = None
                select_sheets = []

                for sheet_name, part in sheets:
                    if part == '공통':
                        common_sheet = (sheet_name, part)
                    else:
                        select_sheets.append((sheet_name, part))

                if common_sheet and select_sheets:
                    # 공통 점수
                    common_scores = self.loader.load_scores(common_sheet[0])
                    # 수정된 부분 1: 유효한 점수 데이터가 없으면 해당 과목을 건너뜀
                    if not common_scores:
                        print(f'  ℹ {subject} 과목에 유효한 점수 데이터가 없어 총점에서 제외합니다.')
                        continue

                    common_max = self.loader.get_max_score(common_sheet[0])

                    # 모든 선택과목의 평균 점수 계산
                    select_max = self.loader.get_max_score(select_sheets[0][0])  # 선택과목 만점은 동일

                    # 각 모델별 선택과목 평균 점수 계산
                    model_select_avg = defaultdict(float)
                    for select_sheet_name, select_part in select_sheets:
                        select_scores = self.loader.load_scores(select_sheet_name)
                        for model, score in select_scores.items():
                            model_select_avg[model] += score

                    # 평균 계산
                    num_selects = len(select_sheets)
                    for model in model_select_avg.keys():
                        model_select_avg[model] /= num_selects

                    subject_details[subject] = {
                        'max': common_max + select_max,
                        'type': 'common+select',
                        'select_count': num_selects,
                        'select_names': [part for _, part in select_sheets]
                    }

                    for model in common_scores.keys():
                        total = common_scores[model] + model_select_avg.get(model, 0)
                        model_total_scores[model] += total

        # 데이터 정렬 (점수 내림차순)
        sorted_items = sorted(model_total_scores.items(), key=lambda x: x[1], reverse=True)
        model_names = [item[0] for item in sorted_items]
        total_scores = [item[1] for item in sorted_items]

        # 만점 계산 (subject_details에 추가된 과목들만 합산하므로 자동으로 유효한 과목만 계산됨)
        total_max_score = sum(details['max'] for details in subject_details.values())

        # 동적 폭 계산 (절반으로 축소)
        num_models = len(model_names)
        fig_width = max(7, min(14, 6 + num_models * 0.5))  # 절반 크기

        # 차트 생성
        fig, ax = plt.subplots(figsize=(fig_width, 6))
        # 막대 간격 조정 (0.75로 증가)
        x = np.arange(len(model_names)) * 0.75
        colors = ChartConfig.get_model_colors(model_names)

        # 막대 폭 절반 크기 유지
        bar_width = max(0.25, min(0.4, 0.5 - num_models * 0.0075))
        bars = ax.bar(x, total_scores, width=bar_width, color=colors, alpha=0.8, edgecolor='black', linewidth=1.5)

        # 제목 및 설명
        subject_list = ', '.join(subject_details.keys()) # subject_details.keys()를 사용해 유효한 과목만 표시
        title = f'2026 수능 주요 과목 LLM 모델별 총점 비교'

        # 선택과목이 있는 과목 정보 생성
        elective_info = []
        for subj, details in subject_details.items():
            if details['type'] == 'common+select':
                select_names = ', '.join(details['select_names'])
                elective_info.append(f"{subj}({select_names} 평균)")

        if elective_info:
            subtitle = f'포함 과목: {subject_list} | 선택과목: {" / ".join(elective_info)}'
        else:
            subtitle = f'포함 과목: {subject_list}'

        ax.set_ylabel('총점 (점)', fontsize=13, fontweight='bold')
        ax.set_title(title, fontsize=16, fontweight='bold', pad=15)
        ax.text(0.5, 0.98, subtitle, transform=ax.transAxes,
                ha='center', va='top', fontsize=11, style='italic', color='#555')
        ax.set_xticks(x)
        ax.set_xticklabels(model_names, fontsize=11, fontweight='bold', rotation=45, ha='right')  # 45도 회전
        ax.set_ylim(0, max(total_scores) * 1.15 if total_scores else 100)
        ax.axhline(y=total_max_score, color='gray', linestyle='--', linewidth=1.5, alpha=0.6,
                   label=f'만점 ({total_max_score}점)')
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        ax.legend(fontsize=11, loc='upper right')

        # 점수 표시
        for i, (bar, score) in enumerate(zip(bars, total_scores)):
            color = 'red' if score == total_max_score else 'black'

            # 점수 표시 (정수인 경우 소수점 없이, 아니면 소수점 1자리)
            if score == int(score):
                score_text = f'{int(score)}'
            else:
                score_text = f'{score:.1f}'

            ax.text(bar.get_x() + bar.get_width()/2., score + total_max_score * 0.02,
                    score_text, ha='center', va='bottom', fontsize=12, fontweight='bold', color=color)

        plt.tight_layout()

        # 파일 저장
        filename = 'overall_comparison.png'
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')
        print(f'  📊 총 {len(subject_details)}개 과목, 만점 {total_max_score}점')

        return filepath


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
    parser.add_argument('--overall', action='store_true',
                        help='전과목 합산 비교 차트만 생성')
    parser.add_argument('--no-overall', action='store_true',
                        help='전과목 합산 차트 생성 안 함')
    parser.add_argument('--subject-model', action='store_true',
                        help='과목-모델별 상세 비교 차트 생성')
    parser.add_argument('--no-subject-model', action='store_true',
                        help='과목-모델별 상세 비교 차트 생성 안 함')

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

    # 전과목 합산 차트만 생성
    if args.overall:
        try:
            generator.create_overall_comparison_chart()
        except Exception as e:
            print(f'  ✗ 전과목 합산 차트 생성 실패: {e}')
        print(f'\n{"="*60}')
        print('✅ 차트 생성 완료!')
        print(f'{"="*60}\n')
        return

    # 과목-모델별 상세 비교 차트만 생성
    if args.subject_model:
        try:
            generator.create_subject_model_comparison_chart()
        except Exception as e:
            print(f'  ✗ 과목-모델별 상세 비교 차트 생성 실패: {e}')
        print(f'\n{"="*60}')
        print('✅ 차트 생성 완료!')
        print(f'{"="*60}\n')
        return

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

    # 전과목 합산 차트 생성 (기본적으로 생성, --no-overall 옵션으로 제외 가능)
    if not args.no_overall:
        try:
            generator.create_overall_comparison_chart()
        except Exception as e:
            print(f'  ✗ 전과목 합산 차트 생성 실패: {e}')

    # 과목-모델별 상세 비교 차트 생성 (기본적으로 생성, --no-subject-model 옵션으로 제외 가능)
    if not args.no_subject_model:
        try:
            generator.create_subject_model_comparison_chart()
        except Exception as e:
            print(f'  ✗ 과목-모델별 상세 비교 차트 생성 실패: {e}')

    print(f'\n{"="*60}')
    print('✅ 차트 생성 완료!')
    print(f'{"="*60}\n')


if __name__ == '__main__':
    main()
