# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a data analysis project tracking LLM (Large Language Model) performance on the 2026 Korean SAT (수능). The project compares multiple models (GPT-5.x series and Gemini 2.5 series) across Korean Language and Math subjects, with detailed scoring and visualization.

## Data Structure

### Excel File Format (`2026 수능 LLM 풀이.xlsx`)

The Excel workbook contains multiple sheets following a strict naming convention:
- Sheet naming: `{Subject}-{Section}` (e.g., `국어-공통`, `수학-확통`)
- Each sheet structure:
  - Column 1: `문항 번호` (Question Number)
  - Column 2: `정답` (Correct Answer)
  - Columns 3+: Model names (auto-detected, any column not named '문항 번호', '정답', or 'Unnamed')
  - Last row: `총점`/`총합`/`점수` (Total Score)

**Important**: The system auto-detects models from column headers. To add a new model, simply add a column with the model name - no code changes needed.

### Current Subject Structure

**Korean (국어)**:
- Common section: 34 questions, 76 points
- Electives: 화법과 작문 (Speech & Writing), 언어와 매체 (Language & Media) - 11 questions each, 24 points

**Math (수학)**:
- Common section: 22 questions, 74 points
- Electives: 확률과 통계 (Probability & Statistics), 미적분 (Calculus), 기하 (Geometry) - 8 questions each, 26 points

## Chart Generation System

### Architecture

The `generate_charts.py` script uses a fully automated, extensible architecture:

```
DataLoader (data extraction)
    ↓
ChartGenerator (visualization)
    ↓
Output: PNG files in images/
```

**Key Classes**:
- `DataLoader`: Parses Excel sheets, auto-detects subjects/models/scores
- `ChartGenerator`: Creates bar charts (summary & breakdown views)
- `ChartConfig`: Manages colors and styling

### Auto-Detection Features

1. **Subject Detection**: Parses sheet names with `{subject}-{section}` format
2. **Model Detection**: Extracts all columns except '문항 번호', '정답', and 'Unnamed*'
3. **Score Detection**: Finds rows with '총점', '총합', or '점수'

### Chart Generation Commands

```bash
# Generate all charts
python generate_charts.py

# List available subjects (useful before generating)
python generate_charts.py --list

# Generate specific subject only
python generate_charts.py --subjects 국어
python generate_charts.py --subjects 국어 수학

# Generate specific chart type
python generate_charts.py --mode summary      # Summary charts only
python generate_charts.py --mode breakdown    # Breakdown charts only

# Custom output directory
python generate_charts.py --output custom_dir
```

### Chart Types

For each subject-section combination, two charts are generated:

1. **Summary Chart** (`{subject}_score_{section}.png`):
   - Bar chart showing total scores (common + elective)
   - Red highlighting for perfect scores (100점)

2. **Breakdown Chart** (`{subject}_breakdown_{section}.png`):
   - Stacked bar chart showing common vs. elective scores
   - Color-coded sections (green for common, varies for electives)

### Filename Mapping

The system uses safe English filenames for Korean section names:
- `확률과 통계` → `hwakton`
- `미적분` → `calculus`
- `기하` → `geometry`
- `화법과 작문` → `hwajak`
- `언어와 매체` → `unmae`

## Adding New Content

### To Add a New Subject (e.g., English)

1. Add sheets to Excel: `영어-공통`, `영어-듣기`, etc.
2. Follow the standard format (문항 번호, 정답, model columns, 총점 row)
3. Run: `python generate_charts.py --subjects 영어`

No code modifications required.

### To Add a New Model

1. Add a column to all relevant sheets with the model name
2. Fill in answers and calculate 총점
3. Run: `python generate_charts.py`

The script auto-detects the new model.

### To Update README Statistics

When adding new subjects or updating scores:
1. Update the Excel file
2. Regenerate charts: `python generate_charts.py`
3. Manually update README.md with new statistics (no automation for this)

## File Organization

```
2026 수능 LLM 풀이/
├── 2026 수능 LLM 풀이.xlsx    # Source data
├── readme.md                   # Manual statistics summary
├── generate_charts.py          # Automated chart generator
└── images/                     # Generated charts
    ├── score_comparison_*.png  # Summary charts
    ├── score_breakdown_*.png   # Breakdown charts
    └── math_*.png              # Math subject charts
```

## Dependencies

Required Python packages:
- `pandas` - Excel file reading
- `openpyxl` - Excel file format support
- `matplotlib` - Chart generation
- `numpy` - Numerical operations

Install with: `pip install pandas openpyxl matplotlib numpy`

**Font Requirement**: The system uses `Malgun Gothic` font for Korean text rendering. This is configured in the script and should be available on Windows systems by default.

## Design Principles

1. **Zero Configuration**: The system should work without hardcoded subject/model lists
2. **Convention Over Configuration**: Follow the `{subject}-{section}` naming pattern
3. **Fail-Safe Detection**: Unknown columns are safely ignored
4. **Extensibility First**: Adding subjects/models requires no code changes

## Scoring System

- Each subject has a 100-point scale
- Common section + one elective = 100 points total
- Perfect scores (100점) are highlighted in red on charts
- The Excel file must contain the '정답' column with maximum scores in the 총점 row
