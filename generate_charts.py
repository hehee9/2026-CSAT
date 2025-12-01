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
import json
from pathlib import Path
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

    GPT_COLOR = '#EA4335'       # OpenAI - 빨간색
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

    def load_question_answers(self, sheet_name):
        """문항별 모든 모델의 응답 로드

        Returns:
            dict: {
                'questions': [1, 2, 3, ...],
                'correct_answers': {1: 3, 2: 5, ...},
                'model_answers': {
                    'GPT-5.1': {1: 3, 2: 5, ...},
                    'Gemini 2.5 Pro': {1: 4, 2: 5, ...},
                    ...
                }
            }
        """
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

        # 총점 행 제외 (문항 번호가 숫자인 행만 선택)
        df_questions = df_clean[pd.to_numeric(df_clean['문항 번호'], errors='coerce').notna()].copy()
        df_questions['문항 번호'] = pd.to_numeric(df_questions['문항 번호'])

        # 문항 번호 리스트
        questions = sorted(df_questions['문항 번호'].astype(int).tolist())

        # 정답 매핑
        correct_answers = {}
        if '정답' in df_questions.columns:
            for _, row in df_questions.iterrows():
                q_num = int(row['문항 번호'])
                answer = row['정답']
                if pd.notna(answer):
                    try:
                        correct_answers[q_num] = int(answer)
                    except:
                        pass

        # 모델별 응답 추출
        model_answers = {}
        for col in df_clean.columns:
            col_str = str(col).strip()
            # 불필요한 컬럼 제외
            if col_str in ['문항 번호', '정답', 'nan', '']:
                continue
            if 'Unnamed' in col_str:
                continue

            # 이 모델의 응답 추출
            answers = {}
            for _, row in df_questions.iterrows():
                q_num = int(row['문항 번호'])
                answer = row[col]
                # 유효한 응답만 포함 (NaN 제외)
                if pd.notna(answer):
                    try:
                        answers[q_num] = int(answer)
                    except:
                        pass

            model_answers[col_str] = answers

        return {
            'questions': questions,
            'correct_answers': correct_answers,
            'model_answers': model_answers
        }

    def load_questions_metadata(self, subject, section):
        """questions.json에서 문제별 메타데이터 로드 (이미지 여부, 배점)

        Args:
            subject: 과목명
            section: 영역명

        Returns:
            dict: {
                question_number: {
                    'has_image': True/False,
                    'points': int
                },
                ...
            }
        """
        # questions.json 경로 찾기
        base_path = Path('problems')

        # 탐구 과목 목록
        탐구_subjects = ['물리1', '화학1', '생명1', '지과1', '사회문화', '물리2', '화학2', '생명2', '지과2']

        # 과목별 경로 구성
        if subject in ['영어', '한국사']:
            # 단일 시트 과목 (영어, 한국사)
            json_path = base_path / subject / 'questions.json'
        elif subject in 탐구_subjects or section == '전체':
            # 탐구 과목: problems/탐구/{과목명}/questions.json
            json_path = base_path / '탐구' / subject / 'questions.json'
        else:
            # 국어/수학 등 공통+선택 과목
            section_map = {
                '공통': '공통',
                '화작': '화작',
                '화법과 작문': '화작',
                '언매': '언매',
                '언어와 매체': '언매',
                '확통': '확통',
                '확률과 통계': '확통',
                '미적분': '미적',
                '기하': '기하'
            }
            section_folder = section_map.get(section, section)
            json_path = base_path / subject / section_folder / 'questions.json'

        if not json_path.exists():
            print(f'  ⚠ questions.json을 찾을 수 없습니다: {json_path}')
            return {}

        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            metadata = {}
            for q in data.get('questions', []):
                q_num = q['number']
                has_image = len(q.get('image_paths', [])) > 0
                points = q.get('points', 0)

                metadata[q_num] = {
                    'has_image': has_image,
                    'points': points
                }

            return metadata

        except Exception as e:
            print(f'  ⚠ questions.json 로드 실패 ({json_path}): {e}')
            return {}

    def calculate_image_based_scores(self, sheet_name, subject, section):
        """이미지 첨부 여부에 따른 모델별 득점률 계산 (만점 대비 퍼센트)

        Args:
            sheet_name: 시트명
            subject: 과목명
            section: 영역명

        Returns:
            dict: {
                'model_stats': {
                    model_name: {
                        'with_image_rate': 득점률(%),
                        'without_image_rate': 득점률(%),
                        'average_rate': 평균 득점률(%)
                    }
                },
                'with_image_max': 이미지 있는 문제 만점,
                'without_image_max': 이미지 없는 문제 만점,
                'with_image_count': 이미지 있는 문제 수,
                'without_image_count': 이미지 없는 문제 수
            }
        """
        # 문제별 메타데이터 로드
        metadata = self.load_questions_metadata(subject, section)
        if not metadata:
            return None

        # 모델별 응답 로드
        question_data = self.load_question_answers(sheet_name)
        questions = question_data['questions']
        correct_answers = question_data['correct_answers']
        model_answers = question_data['model_answers']

        # 이미지 있는 문제 / 없는 문제 분류
        with_image_questions = [q for q in questions if metadata.get(q, {}).get('has_image', False)]
        without_image_questions = [q for q in questions if not metadata.get(q, {}).get('has_image', False)]

        # 만점 계산
        with_image_max = sum(metadata[q]['points'] for q in with_image_questions if q in metadata)
        without_image_max = sum(metadata[q]['points'] for q in without_image_questions if q in metadata)

        # 모델별 득점 및 득점률 계산
        model_stats = {}
        for model_name, answers in model_answers.items():
            with_image_score = 0
            without_image_score = 0

            # 이미지 있는 문제 득점
            for q_num in with_image_questions:
                if q_num in answers and q_num in correct_answers:
                    if answers[q_num] == correct_answers[q_num]:
                        with_image_score += metadata[q_num]['points']

            # 이미지 없는 문제 득점
            for q_num in without_image_questions:
                if q_num in answers and q_num in correct_answers:
                    if answers[q_num] == correct_answers[q_num]:
                        without_image_score += metadata[q_num]['points']

            # 득점률 계산 (만점 대비 퍼센트)
            with_image_rate = (with_image_score / with_image_max * 100) if with_image_max > 0 else 0
            without_image_rate = (without_image_score / without_image_max * 100) if without_image_max > 0 else 0

            # 전체 평균 득점률
            total_score = with_image_score + without_image_score
            total_max = with_image_max + without_image_max
            average_rate = (total_score / total_max * 100) if total_max > 0 else 0

            model_stats[model_name] = {
                'with_image_rate': with_image_rate,
                'without_image_rate': without_image_rate,
                'average_rate': average_rate
            }

        return {
            'model_stats': model_stats,
            'with_image_max': with_image_max,
            'without_image_max': without_image_max,
            'with_image_count': len(with_image_questions),
            'without_image_count': len(without_image_questions)
        }


class ChartGenerator:
    """차트 생성기 클래스"""

    # 수학 서술형 문항 번호 (선지 선택률 차트에서 제외)
    MATH_DESCRIPTIVE_QUESTIONS = {16, 17, 18, 19, 20, 21, 22, 29, 30}

    def __init__(self, data_loader, output_dir='images'):
        self.loader = data_loader
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _add_watermark(self, ax):
        """차트 좌상단에 워터마크 추가"""
        ax.text(0.01, 1.02, 'Github/hehee9', transform=ax.transAxes,
                fontsize=10, color='gray', alpha=0.7,
                ha='left', va='bottom')

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

    def _calculate_choice_rates(self, question_data, subject):
        """선지별 선택률 계산 (무응답 제외)

        Args:
            question_data: load_question_answers() 결과
            subject: 과목명 (수학일 경우 서술형 제외)

        Returns:
            dict: {
                question_number: {
                    'choices': [1, 2, 3, 4, 5],
                    'rates': [0.8, 0.0, 0.12, 0.04, 0.04],  # 선지별 선택률
                    'correct': 1,  # 정답 선지
                    'total_responses': 25  # 총 응답 수 (무응답 제외)
                },
                ...
            }
        """
        questions = question_data['questions']
        correct_answers = question_data['correct_answers']
        model_answers = question_data['model_answers']

        # 수학인 경우 서술형 문항 제외
        if subject == '수학':
            questions = [q for q in questions if q not in self.MATH_DESCRIPTIVE_QUESTIONS]

        choice_stats = {}

        for q_num in questions:
            # 이 문항에 대한 모든 모델의 응답 수집
            responses = []
            for model_name, answers in model_answers.items():
                if q_num in answers:
                    responses.append(answers[q_num])

            # 응답이 없으면 건너뛰기
            if not responses:
                continue

            # 선지별 개수 계산 (1~5 범위로 가정)
            choice_counts = {i: 0 for i in range(1, 6)}
            for response in responses:
                if 1 <= response <= 5:
                    choice_counts[response] += 1

            total_responses = len(responses)

            # 선택률 계산 (백분율)
            rates = [choice_counts[i] / total_responses * 100 for i in range(1, 6)]

            choice_stats[q_num] = {
                'choices': list(range(1, 6)),
                'rates': rates,
                'correct': correct_answers.get(q_num, None),
                'total_responses': total_responses
            }

        return choice_stats

    def create_choice_rate_chart(self, subject, sheet_name, section):
        """과목별 문항 선지 선택률 차트 생성 (세로 막대 그래프)

        Args:
            subject: 과목명
            sheet_name: 시트명
            section: 영역명 (공통, 화작, 언매, 확통, 미적분, 기하 등)
        """
        # 응답 데이터 로드
        question_data = self.loader.load_question_answers(sheet_name)
        choice_stats = self._calculate_choice_rates(question_data, subject)

        if not choice_stats:
            print(f'  ℹ {subject}-{section}: 선택률 데이터가 없습니다.')
            return

        questions = sorted(choice_stats.keys())
        choice_symbols = {1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤'}

        # 문항당 너비 계산
        question_width = 2.5  # 각 문항당 너비 (인치)
        fig_width = max(12, len(questions) * question_width + 2)

        # 차트 생성
        fig, ax = plt.subplots(figsize=(fig_width, 8))

        # X축 위치 계산
        bar_width = 0.15  # 각 선지의 막대 폭
        x_base = np.arange(len(questions)) * 0.85  # 문항 간격 (줄임)

        # 선지별로 막대 그리기 (①②③④⑤)
        for choice_idx in range(1, 6):
            x_positions = []
            heights = []
            colors = []
            edge_widths = []

            for q_idx, q_num in enumerate(questions):
                stats = choice_stats[q_num]
                correct = stats['correct']
                rate = stats['rates'][choice_idx - 1]  # 1-based to 0-based index

                x_positions.append(x_base[q_idx] + (choice_idx - 3) * bar_width)
                heights.append(rate)

                # 정답 여부에 따라 색상 결정 (선택률에 따라 강도 조절)
                # 낮은 비율 = 연한(밝은) 색, 높은 비율 = 진한(어두운) 색
                # 흰색(255)에서 목표 색상으로 블렌딩

                if choice_idx == correct:
                    # 정답: 초록색 계열 (RGB: 46, 125, 50 = #2E7D32)
                    target_r, target_g, target_b = 46, 125, 50
                    blend = 0.2 + (rate / 100.0) * 0.8  # 0.2~1.0
                    edge_widths.append(0.5)
                else:
                    # 오답: 빨간색 계열 (RGB: 211, 47, 47 = #D32F2F)
                    target_r, target_g, target_b = 211, 47, 47
                    blend = 0.1 + (rate / 100.0) * 0.6  # 0.1~0.7
                    edge_widths.append(0.5)

                # 흰색에서 목표 색상으로 보간
                white = 255
                r = int(white + (target_r - white) * blend)
                g = int(white + (target_g - white) * blend)
                b = int(white + (target_b - white) * blend)
                colors.append(f'#{r:02x}{g:02x}{b:02x}')

            # 막대 그리기
            for x, h, c, ew in zip(x_positions, heights, colors, edge_widths):
                ax.bar(x, h, width=bar_width, color=c, alpha=1.0,
                      edgecolor='black', linewidth=ew)

                # 선택률 표시 (0보다 클 때만)
                if h > 0:
                    # 진한 색상일 때 텍스트도 굵게
                    fontweight = 'bold' if h >= 50 else 'normal'
                    # 소수점이 0이면 정수로, 아니면 소수점 1자리로 표시 (% 기호 제거)
                    rate_text = f'{int(h)}' if h == int(h) else f'{h:.1f}'
                    ax.text(x, h + 2, rate_text, ha='center', va='bottom',
                           fontsize=13, fontweight=fontweight, rotation=0)

        # 선지 기호를 모든 문항의 X축 레이블로 표시 (상단)
        # X축 틱을 각 선지 위치에 설정
        all_x_positions = []
        all_labels = []
        for q_idx, q_num in enumerate(questions):
            for choice_idx in range(1, 6):
                x_pos = x_base[q_idx] + (choice_idx - 3) * bar_width
                all_x_positions.append(x_pos)
                all_labels.append(choice_symbols[choice_idx])

        ax.set_xticks(all_x_positions)
        ax.set_xticklabels(all_labels, fontsize=14, rotation=0)

        # 문항 번호를 X축 아래에 표시
        for q_idx, q_num in enumerate(questions):
            ax.text(x_base[q_idx], -15, f'{q_num}번', ha='center', va='top',
                   fontsize=15, fontweight='normal')

        # 문항 간 구분선 추가 (연한 회색 세로선)
        for q_idx in range(1, len(questions)):
            # 이전 문항의 마지막 선지와 현재 문항의 첫 선지 사이
            separator_x = (x_base[q_idx-1] + x_base[q_idx]) / 2
            ax.axvline(x=separator_x, color='lightgray', linestyle='-', linewidth=1, alpha=0.5, zorder=0)

        # 축 설정
        ax.set_ylim(0, 110)
        ax.set_ylabel('선택률', fontsize=16, fontweight='bold')
        ax.set_title(f'2026 수능 {subject} 영역 문항별 선지 선택률 ({section})',
                    fontsize=18, fontweight='bold', pad=20)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        ax.axhline(y=0, color='black', linewidth=1)

        # 범례 추가 (그래프 박스 외부 상단)
        from matplotlib.patches import Patch
        legend_elements = [
            Patch(facecolor='#2E7D32', alpha=1.0, edgecolor='black', linewidth=0.5, label='정답 (초록, 선택률에 따라 진함)'),
            Patch(facecolor='#D32F2F', alpha=1.0, edgecolor='black', linewidth=0.5, label='오답 (빨강, 선택률에 따라 진함)')
        ]
        ax.legend(handles=legend_elements, loc='lower right', bbox_to_anchor=(1.0, 1.02), fontsize=13, frameon=True)

        # 워터마크 추가
        self._add_watermark(ax)

        plt.tight_layout()

        # 파일명 생성
        section_safe = self._get_filename_safe(section)
        filename = f'{subject.lower()}_choice_rate_{section_safe}.png'
        filepath = os.path.join(self.output_dir, filename)

        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')
        return filepath

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
        bars = ax.bar(x, total_scores, width=bar_width, color=colors, alpha=0.9, edgecolor='black', linewidth=0.5)

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
        ax.legend(fontsize=10, loc='lower right', bbox_to_anchor=(1.0, 1.02), frameon=True)

        # 점수 표시
        for i, (bar, score) in enumerate(zip(bars, total_scores)):
            color = 'red' if score == total_max_score else 'black'
            ax.text(bar.get_x() + bar.get_width()/2., score + 1.5,
                    f'{score}', ha='center', va='bottom', fontsize=11, fontweight='bold', color=color)

        # 워터마크 추가
        self._add_watermark(ax)

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

        # 워터마크 추가
        self._add_watermark(ax)

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

        # 워터마크 추가
        self._add_watermark(ax)

        plt.tight_layout()

        # 파일명 생성
        sort_suffix = '_by_score' if sort_by == 'score' else '_by_name'
        filename = f'{subject.lower()}_average_breakdown{sort_suffix}.png'
        filepath = os.path.join(self.output_dir, filename)

        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')
        return filepath

    def generate_for_subject(self, subject, mode='all', include_choice_rate=False):
        """특정 과목의 모든 차트 생성

        Args:
            subject: 과목명
            mode: 차트 종류 (summary/breakdown/all)
            include_choice_rate: 선지 선택률 차트 생성 여부
        """
        print(f'\n[{subject} 영역]')

        sheets = self.loader.get_subject_sheets(subject)

        # 단일 시트 과목 처리 (예: 영어, 한국사)
        if len(sheets) == 1 and sheets[0][1] == '전체':
            if mode in ['summary', 'all']:
                # 모델명순/성적순 차트 각각 생성
                self.create_summary_chart(subject, [sheets[0]], sort_by='name')
                self.create_summary_chart(subject, [sheets[0]], sort_by='score')

            # 선지 선택률 차트 생성 (단일 시트 과목)
            if include_choice_rate:
                self.create_choice_rate_chart(subject, sheets[0][0], sheets[0][1])

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

        # 선지 선택률 차트 생성 (공통 + 각 선택과목별)
        if include_choice_rate:
            # 공통 영역
            self.create_choice_rate_chart(subject, common_sheet[0], common_sheet[1])

            # 각 선택과목
            for select_sheet in select_sheets:
                self.create_choice_rate_chart(subject, select_sheet[0], select_sheet[1])

    def create_overall_comparison_chart(self):
        """전과목 합산 비교 차트 생성"""
        print('\n[전과목 종합]')

        # 모든 과목의 점수 수집
        subjects = self.loader.get_subjects()
        model_total_scores = defaultdict(int)
        subject_details = {}  # 과목별 상세 정보

        # 탐구 과목 분류 (국어, 수학, 영어, 한국사가 아닌 과목)
        core_subjects = {'국어', '수학', '영어', '한국사'}
        탐구_subjects = []

        for subject in subjects:
            if subject not in core_subjects:
                탐구_subjects.append(subject)

        # 탐구 과목이 2개보다 많으면 2개 선택한 것으로 평균 계산
        탐구_multiplier = 2 / len(탐구_subjects) if len(탐구_subjects) > 0 else 1

        for subject in subjects:
            sheets = self.loader.get_subject_sheets(subject)

            # 단일 시트 과목 (예: 영어, 한국사, 탐구 과목들)
            if len(sheets) == 1 and sheets[0][1] == '전체':
                scores = self.loader.load_scores(sheets[0][0])
                # 수정된 부분 1: 유효한 점수 데이터가 없으면 해당 과목을 건너뜀
                if not scores:
                    print(f'  ℹ {subject} 과목에 유효한 점수 데이터가 없어 총점에서 제외합니다.')
                    continue

                max_score = self.loader.get_max_score(sheets[0][0])

                # 탐구 과목인 경우
                if subject in 탐구_subjects:
                    subject_details[subject] = {
                        'max': max_score * 탐구_multiplier,
                        'type': 'single',
                        'is_탐구': True
                    }
                    for model, score in scores.items():
                        model_total_scores[model] += score * 탐구_multiplier
                else:
                    # 영어, 한국사 등
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
        bars = ax.bar(x, total_scores, width=bar_width, color=colors, alpha=0.9, edgecolor='black', linewidth=1.5)

        # 제목 및 설명
        # 과목 순서: 국어 - 수학 - 영어 - 한국사 - 탐구
        subject_order = ['국어', '수학', '영어', '한국사']
        탐구_subjects = []
        ordered_subjects = []

        for subj in subject_order:
            if subj in subject_details:
                ordered_subjects.append(subj)

        # 탐구 과목 수집
        for subj in subject_details.keys():
            if subj not in subject_order:  # 국어/수학/영어/한국사가 아닌 것들은 탐구로 간주
                탐구_subjects.append(subj)

        # 탐구 과목이 있으면 뭉쳐서 추가
        if 탐구_subjects:
            ordered_subjects.append('탐구')

        subject_list = ', '.join(ordered_subjects)
        title = f'2026 수능 주요 과목 LLM 모델별 총점 비교'

        # 선택과목 정보 생성
        elective_info = []
        for subj in subject_order:
            if subj in subject_details:
                details = subject_details[subj]
                if details['type'] == 'common+select':
                    select_names = ', '.join(details['select_names'])
                    elective_info.append(f"{subj}({select_names} 평균)")

        # 탐구 과목 정보 추가 (2과목 환산)
        if 탐구_subjects:
            elective_info.append(f"탐구({', '.join(탐구_subjects)} 2과목 환산)")

        if elective_info:
            subtitle_line1 = f'포함 과목: {subject_list}'
            subtitle_line2 = f'선택과목: {" / ".join(elective_info)}'
        else:
            subtitle_line1 = f'포함 과목: {subject_list}'
            subtitle_line2 = ''

        ax.set_ylabel('총점 (점)', fontsize=13, fontweight='bold')
        ax.set_title(title, fontsize=16, fontweight='bold', pad=45)  # pad 증가 (35 -> 45)
        # 포함 과목 정보를 그래프 박스 바깥(제목 아래)에 2줄로 배치
        fig.text(0.5, 0.93, subtitle_line1, ha='center', va='top',
                 fontsize=11, style='italic', color='#555', transform=fig.transFigure)
        if subtitle_line2:
            fig.text(0.5, 0.895, subtitle_line2, ha='center', va='top',
                     fontsize=11, style='italic', color='#555', transform=fig.transFigure)
        ax.set_xticks(x)
        ax.set_xticklabels(model_names, fontsize=11, fontweight='bold', rotation=45, ha='right')  # 45도 회전
        ax.set_ylim(0, max(total_scores) * 1.15 if total_scores else 100)
        ax.axhline(y=total_max_score, color='gray', linestyle='--', linewidth=1.5, alpha=0.6,
                   label=f'만점 ({total_max_score}점)')
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        ax.legend(fontsize=11, loc='lower right', bbox_to_anchor=(1.0, 1.02), frameon=True)

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

        # 워터마크 추가
        self._add_watermark(ax)

        plt.tight_layout()

        # 파일 저장
        filename = 'overall_comparison.png'
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')
        print(f'  📊 총 {len(subject_details)}개 과목, 만점 {total_max_score}점')

        return filepath

    def create_overall_best_worst_chart(self):
        """전과목 최고/최저점 조합 비교 차트 생성

        선택과목 조합:
        - 국어: 언매/화작 중 1개
        - 수학: 확통/미적분/기하 중 1개
        - 탐구: 물1/화1/생1/사문 중 2개
        """
        print('\n[전과목 종합 - 최고/최저점 조합]')

        from itertools import combinations

        subjects = self.loader.get_subjects()

        # 과목별 데이터 수집
        # 영어, 한국사: 고정 점수
        # 국어, 수학: 공통 + 선택과목별 점수
        # 탐구: 각 과목별 점수

        fixed_scores = {}  # 영어, 한국사
        korean_data = {'common': {}, 'electives': {}}  # 국어
        math_data = {'common': {}, 'electives': {}}  # 수학
        science_scores = {}  # 탐구 과목들

        # 탐구 과목 목록 (실제 데이터에서 확인)
        core_subjects = {'국어', '수학', '영어', '한국사'}

        for subject in subjects:
            sheets = self.loader.get_subject_sheets(subject)

            # 단일 시트 과목 (영어, 한국사, 탐구 과목들)
            if len(sheets) == 1 and sheets[0][1] == '전체':
                scores = self.loader.load_scores(sheets[0][0])
                if not scores:
                    continue

                if subject in ['영어', '한국사']:
                    fixed_scores[subject] = scores
                else:
                    # 탐구 과목
                    science_scores[subject] = scores

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
                    common_scores = self.loader.load_scores(common_sheet[0])
                    if not common_scores:
                        continue

                    if subject == '국어':
                        korean_data['common'] = common_scores
                        for sheet_name, part in select_sheets:
                            korean_data['electives'][part] = self.loader.load_scores(sheet_name)
                    elif subject == '수학':
                        math_data['common'] = common_scores
                        for sheet_name, part in select_sheets:
                            math_data['electives'][part] = self.loader.load_scores(sheet_name)

        # 모델 목록 (공통 기준)
        model_names = list(korean_data['common'].keys()) if korean_data['common'] else []
        if not model_names:
            print('  ⚠ 모델 데이터를 찾을 수 없습니다.')
            return

        # 각 모델별 최고/최저점 계산
        model_best_scores = {}
        model_worst_scores = {}

        for model in model_names:
            # 고정 점수 (영어, 한국사)
            fixed_total = sum(scores.get(model, 0) for scores in fixed_scores.values())

            # 국어: 공통 + 선택 중 최고/최저
            korean_common = korean_data['common'].get(model, 0)
            korean_elective_scores = [scores.get(model, 0) for scores in korean_data['electives'].values()]
            korean_best = korean_common + max(korean_elective_scores) if korean_elective_scores else korean_common
            korean_worst = korean_common + min(korean_elective_scores) if korean_elective_scores else korean_common

            # 수학: 공통 + 선택 중 최고/최저
            math_common = math_data['common'].get(model, 0)
            math_elective_scores = [scores.get(model, 0) for scores in math_data['electives'].values()]
            math_best = math_common + max(math_elective_scores) if math_elective_scores else math_common
            math_worst = math_common + min(math_elective_scores) if math_elective_scores else math_common

            # 탐구: 2과목 조합 중 최고/최저
            science_subject_scores = [(subj, scores.get(model, 0)) for subj, scores in science_scores.items()]

            if len(science_subject_scores) >= 2:
                # 모든 2과목 조합
                all_combos = list(combinations(science_subject_scores, 2))
                combo_sums = [(combo, sum(s for _, s in combo)) for combo in all_combos]

                best_combo = max(combo_sums, key=lambda x: x[1])
                worst_combo = min(combo_sums, key=lambda x: x[1])

                science_best = best_combo[1]
                science_worst = worst_combo[1]
            elif len(science_subject_scores) == 1:
                science_best = science_worst = science_subject_scores[0][1]
            else:
                science_best = science_worst = 0

            # 총점 계산
            model_best_scores[model] = fixed_total + korean_best + math_best + science_best
            model_worst_scores[model] = fixed_total + korean_worst + math_worst + science_worst

        # 최고점 기준 정렬
        sorted_by_best = sorted(model_best_scores.items(), key=lambda x: x[1], reverse=True)
        model_names_sorted = [item[0] for item in sorted_by_best]

        best_scores = [model_best_scores[m] for m in model_names_sorted]
        worst_scores = [model_worst_scores[m] for m in model_names_sorted]

        # 만점 계산 (영어 100 + 한국사 50 + 국어 100 + 수학 100 + 탐구 50*2)
        # 탐구는 각 과목 50점씩 2과목 = 100점
        actual_max = sum(100 if subj == '영어' else 50 for subj in fixed_scores.keys())
        actual_max += 100 + 100  # 국어, 수학
        actual_max += 50 * 2  # 탐구 2과목 (각 50점)

        # 차트 생성
        num_models = len(model_names_sorted)
        fig_width = max(8, min(16, 7 + num_models * 0.6))

        fig, ax = plt.subplots(figsize=(fig_width, 7))
        x = np.arange(len(model_names_sorted)) * 0.9
        bar_width = 0.35

        colors = ChartConfig.get_model_colors(model_names_sorted)

        # 최고점 막대 (진한 색)
        bars_best = ax.bar(x - bar_width/2, best_scores, width=bar_width,
                          color=colors, alpha=0.9, edgecolor='black', linewidth=1,
                          label='최고점 조합')

        # 최저점 막대 (연한 색)
        light_colors = [ChartConfig.lighten_color(c, 0.5) for c in colors]
        bars_worst = ax.bar(x + bar_width/2, worst_scores, width=bar_width,
                           color=light_colors, alpha=0.9, edgecolor='black', linewidth=1,
                           label='최저점 조합')

        # 제목 및 설명
        title = '2026 수능 LLM 모델별 총점 비교 (최고/최저점 조합)'

        ax.set_ylabel('총점 (점)', fontsize=13, fontweight='bold')
        ax.set_title(title, fontsize=16, fontweight='bold', pad=45)

        # 부제목
        subtitle_line1 = '포함 과목: 국어, 수학, 영어, 한국사, 탐구'
        subtitle_line2 = '선택: 국어(언매/화작 중 1) / 수학(확통/미적/기하 중 1) / 탐구(2과목)'

        fig.text(0.5, 0.93, subtitle_line1, ha='center', va='top',
                fontsize=11, style='italic', color='#555', transform=fig.transFigure)
        fig.text(0.5, 0.895, subtitle_line2, ha='center', va='top',
                fontsize=11, style='italic', color='#555', transform=fig.transFigure)

        ax.set_xticks(x)
        ax.set_xticklabels(model_names_sorted, fontsize=11, fontweight='bold', rotation=45, ha='right')
        ax.set_ylim(0, max(best_scores) * 1.15 if best_scores else 100)
        ax.axhline(y=actual_max, color='gray', linestyle='--', linewidth=1.5, alpha=0.6,
                  label=f'만점 ({actual_max}점)')
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        ax.legend(fontsize=10, loc='lower right', bbox_to_anchor=(1.0, 1.02), frameon=True, ncol=3)

        # 점수 표시
        for i, (bar_b, bar_w, score_b, score_w) in enumerate(zip(bars_best, bars_worst, best_scores, worst_scores)):
            # 최고점
            color_b = 'red' if score_b == actual_max else 'black'
            score_text_b = f'{int(score_b)}' if score_b == int(score_b) else f'{score_b:.1f}'
            ax.text(bar_b.get_x() + bar_b.get_width()/2., score_b + actual_max * 0.01,
                   score_text_b, ha='center', va='bottom', fontsize=10, fontweight='bold', color=color_b)

            # 최저점
            color_w = 'red' if score_w == actual_max else 'black'
            score_text_w = f'{int(score_w)}' if score_w == int(score_w) else f'{score_w:.1f}'
            ax.text(bar_w.get_x() + bar_w.get_width()/2., score_w + actual_max * 0.01,
                   score_text_w, ha='center', va='bottom', fontsize=10, fontweight='bold', color=color_w)

        # 워터마크 추가
        self._add_watermark(ax)

        plt.tight_layout()

        # 파일 저장
        filename = 'overall_best_worst.png'
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')
        print(f'  📊 만점 {actual_max}점 (최고점/최저점 조합)')

        return filepath

    def create_overall_image_based_charts(self):
        """전체 과목 통합 이미지 첨부 여부별 득점률 비교 차트 생성

        - 이미지 있는 문제 득점률 차트 1개
        - 이미지 없는 문제 득점률 차트 1개
        """
        print(f'\n[전체 과목 - 이미지 첨부 여부별 득점률]')

        subjects = self.loader.get_subjects()

        # 모든 과목/섹션의 데이터 수집
        all_with_image_stats = defaultdict(lambda: {'scores': [], 'max_scores': []})
        all_without_image_stats = defaultdict(lambda: {'scores': [], 'max_scores': []})

        for subject in subjects:
            sheets = self.loader.get_subject_sheets(subject)

            for sheet_name, section in sheets:
                # 이미지 기반 득점률 계산
                result = self.loader.calculate_image_based_scores(sheet_name, subject, section)
                if not result:
                    continue

                model_stats = result['model_stats']
                with_image_max = result['with_image_max']
                without_image_max = result['without_image_max']

                # 각 모델의 실제 득점과 만점 수집
                for model_name, stats in model_stats.items():
                    # 이미지 있는 문제
                    if with_image_max > 0:
                        with_image_score = stats['with_image_rate'] * with_image_max / 100
                        all_with_image_stats[model_name]['scores'].append(with_image_score)
                        all_with_image_stats[model_name]['max_scores'].append(with_image_max)

                    # 이미지 없는 문제
                    if without_image_max > 0:
                        without_image_score = stats['without_image_rate'] * without_image_max / 100
                        all_without_image_stats[model_name]['scores'].append(without_image_score)
                        all_without_image_stats[model_name]['max_scores'].append(without_image_max)

        # 모델별 전체 득점률 계산
        with_image_rates = {}
        without_image_rates = {}

        for model_name in all_with_image_stats.keys():
            # 이미지 있는 문제 전체 득점률
            total_score = sum(all_with_image_stats[model_name]['scores'])
            total_max = sum(all_with_image_stats[model_name]['max_scores'])
            with_image_rates[model_name] = (total_score / total_max * 100) if total_max > 0 else 0

        for model_name in all_without_image_stats.keys():
            # 이미지 없는 문제 전체 득점률
            total_score = sum(all_without_image_stats[model_name]['scores'])
            total_max = sum(all_without_image_stats[model_name]['max_scores'])
            without_image_rates[model_name] = (total_score / total_max * 100) if total_max > 0 else 0

        # 차트 1: 이미지 있는 문제
        self._create_single_image_chart(
            with_image_rates,
            '이미지 있는 문제',
            'with_image_accuracy.png'
        )

        # 차트 2: 이미지 없는 문제
        self._create_single_image_chart(
            without_image_rates,
            '이미지 없는 문제',
            'without_image_accuracy.png'
        )

    def _create_single_image_chart(self, rates_dict, title_suffix, filename):
        """단일 이미지 기반 차트 생성 헬퍼"""
        if not rates_dict:
            print(f'  ⚠ {title_suffix} 데이터가 없습니다.')
            return

        # 득점률 기준 정렬 (내림차순)
        sorted_items = sorted(rates_dict.items(), key=lambda x: x[1], reverse=True)
        model_names = [item[0] for item in sorted_items]
        rates = [item[1] for item in sorted_items]

        # 차트 생성
        num_models = len(model_names)
        fig_width = max(8, min(16, 7 + num_models * 0.5))

        fig, ax = plt.subplots(figsize=(fig_width, 7))
        # 막대 간격 조정 (0.75로 다른 차트와 일관성 유지)
        x = np.arange(len(model_names)) * 0.75

        # 막대 폭 조정 (다른 차트와 일관성 유지)
        bar_width = max(0.25, min(0.4, 0.5 - num_models * 0.0075))

        colors = ChartConfig.get_model_colors(model_names)

        # 막대 그래프
        bars = ax.bar(x, rates, width=bar_width,
                     color=colors, alpha=0.9, edgecolor='black', linewidth=1)

        # 제목 설정
        title = f'2026 수능 전체 과목 LLM 모델별 득점률 ({title_suffix})'

        ax.set_ylabel('득점률 (%)', fontsize=13, fontweight='bold')
        ax.set_title(title, fontsize=16, fontweight='bold', pad=20)
        ax.set_xticks(x)
        ax.set_xticklabels(model_names, fontsize=11, fontweight='bold', rotation=45, ha='right')
        ax.set_ylim(0, 110)
        ax.axhline(y=100, color='gray', linestyle='--', linewidth=1.5, alpha=0.6)
        ax.grid(axis='y', alpha=0.3, linestyle='--')

        # 득점률 표시
        for bar, rate in zip(bars, rates):
            if rate > 0:
                rate_text = f'{rate:.1f}%' if rate != int(rate) else f'{int(rate)}%'
                ax.text(bar.get_x() + bar.get_width()/2., rate + 2,
                       rate_text, ha='center', va='bottom', fontsize=10, fontweight='bold')

        # 워터마크 추가
        self._add_watermark(ax)

        plt.tight_layout()

        # 파일 저장
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()

        print(f'  ✓ {filename}')

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
    parser.add_argument('--no-choice-rate', action='store_true',
                        help='과목별 문항 선지 선택률 차트 생성 안 함')
    parser.add_argument('--image-based', action='store_true',
                        help='이미지 첨부 여부별 득점률 비교 차트 생성')
    parser.add_argument('--no-image-based', action='store_true',
                        help='이미지 첨부 여부별 득점률 비교 차트 생성 안 함')

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

    # 이미지 기반 차트만 생성
    if args.image_based:
        try:
            generator.create_overall_image_based_charts()
        except Exception as e:
            print(f'  ✗ 이미지 기반 차트 생성 실패: {e}')

        print(f'\n{"="*60}')
        print('✅ 차트 생성 완료!')
        print(f'{"="*60}\n')
        return

    # 전과목 합산 차트만 생성
    if args.overall:
        try:
            generator.create_overall_comparison_chart()
        except Exception as e:
            print(f'  ✗ 전과목 합산 차트 생성 실패: {e}')

        # 최고/최저점 조합 차트도 함께 생성
        try:
            generator.create_overall_best_worst_chart()
        except Exception as e:
            print(f'  ✗ 최고/최저점 조합 차트 생성 실패: {e}')

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
    # 기본적으로 선택률 차트 생성, --no-choice-rate 옵션으로 제외 가능
    include_choice_rate = not args.no_choice_rate
    for subject in subjects:
        try:
            generator.generate_for_subject(subject, args.mode, include_choice_rate=include_choice_rate)
        except Exception as e:
            print(f'  ✗ {subject} 차트 생성 실패: {e}')

    # 전과목 합산 차트 생성 (기본적으로 생성, --no-overall 옵션으로 제외 가능)
    if not args.no_overall:
        try:
            generator.create_overall_comparison_chart()
        except Exception as e:
            print(f'  ✗ 전과목 합산 차트 생성 실패: {e}')

        # 최고/최저점 조합 차트도 함께 생성
        try:
            generator.create_overall_best_worst_chart()
        except Exception as e:
            print(f'  ✗ 최고/최저점 조합 차트 생성 실패: {e}')

    # 이미지 첨부 여부별 득점률 차트 생성 (기본 생성, --no-image-based 옵션으로 제외 가능)
    if not args.no_image_based:
        try:
            generator.create_overall_image_based_charts()
        except Exception as e:
            print(f'  ✗ 이미지 기반 차트 생성 실패: {e}')

    print(f'\n{"="*60}')
    print('✅ 차트 생성 완료!')
    print(f'{"="*60}\n')


if __name__ == '__main__':
    main()
