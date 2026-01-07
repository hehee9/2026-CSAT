"""
@brief questions.json 파일들에서 이미지 정보만 추출하여 병합

questions.json 파일들에서 이미지 여부와 배점 정보만 추출하여
web/public/questions_metadata.json으로 병합합니다.
"""
import json
from pathlib import Path


def main():
    """메타데이터 병합 메인 함수"""
    base_path = Path(__file__).parent.parent / 'problems'
    output_path = Path(__file__).parent.parent / 'web' / 'public' / 'questions_metadata.json'

    # 대상 과목/섹션 목록
    targets = [
        ('국어/공통', '국어', '공통'),
        ('국어/화작', '국어', '화작'),
        ('국어/언매', '국어', '언매'),
        ('수학/공통', '수학', '공통'),
        ('수학/확통', '수학', '확통'),
        ('수학/미적', '수학', '미적'),
        ('수학/기하', '수학', '기하'),
        ('영어', '영어', '영어'),
        ('한국사', '한국사', '한국사'),
        ('탐구/물리1', '물리1', '탐구'),
        ('탐구/화학1', '화학1', '탐구'),
        ('탐구/생명1', '생명1', '탐구'),
        ('탐구/사회문화', '사회문화', '탐구'),
    ]

    metadata = {}
    total_questions = 0
    with_image_count = 0

    for folder, subject, section in targets:
        json_path = base_path / folder / 'questions.json'
        if not json_path.exists():
            print(f'  ⚠ 파일 없음: {json_path}')
            continue

        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            key = f"{subject}-{section}"
            metadata[key] = {}

            for q in data.get('questions', []):
                has_image = len(q.get('image_paths', [])) > 0
                metadata[key][q['number']] = {
                    'hasImage': has_image,
                    'points': q.get('points', 0)
                }
                total_questions += 1
                if has_image:
                    with_image_count += 1

            print(f'  ✓ {key}: {len(metadata[key])}문항')

        except Exception as e:
            print(f'  ✗ {folder} 로드 실패: {e}')

    # 출력 디렉토리 확인
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f'\n✓ 생성 완료: {output_path}')
    print(f'  총 {total_questions}문항 중 {with_image_count}문항에 이미지 포함')


if __name__ == '__main__':
    print('[questions_metadata.json 생성]')
    main()
