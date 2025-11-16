# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a data analysis project tracking LLM (Large Language Model) performance on the 2026 Korean SAT (수능). The project has two main components:

1. **Manual Testing & Visualization**: Excel-based results tracking with automated chart generation
2. **API Automation**: Automated question submission to multiple LLM APIs for systematic testing

The project compares models from OpenAI (GPT-5 series), Google (Gemini 2.5 series), Anthropic (Claude), DeepSeek, and xAI (Grok) across Korean Language, Math, English, and Korean History subjects.

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

---

## API Automation System

The `api_solver.py` script automates sending SAT questions to multiple LLM APIs and collecting answers. This system is separate from the manual Excel-based testing.

### Architecture

```
problems/ folder (git-ignored)
    ↓ (questions.json + text files + images)
SATSolver → APIClient (OpenAI/Anthropic/Google/DeepSeek/Grok)
    ↓
APIResponse → results.json
```

**Key Components**:
- `Question`: Data class holding question metadata and text loading
- `ModelConfig`: Configuration for each API (keys, model IDs, rate limits, base URLs)
- `APIClient`: Base class for API interactions
- `OpenAIClient`, `AnthropicClient`, `GoogleClient`: API-specific implementations
- `SATSolver`: Main orchestrator that manages multiple clients and question batches

### Question Storage Structure

Questions are stored in the `problems/` folder (excluded from git for copyright):

```
problems/
├── images/
│   ├── 국어/           # Subject-specific image folder
│   │   ├── 1_01.png    # Question 1, image 1
│   │   └── 12_01.png   # Question 12, image 1
│   └── 수학/
├── 국어/
│   ├── 공통/           # Section-specific text files
│   │   ├── 1.txt       # Question 1 full text
│   │   └── 2.txt
│   ├── 화작/
│   ├── 언매/
│   └── questions.json  # Metadata: numbers, answers, points, paths
└── 수학/
    ├── 공통/
    ├── 확통/
    ├── 미적분/
    ├── 기하/
    └── questions.json
```

**questions.json format**:
```json
{
  "subject": "국어",
  "section": "공통",
  "questions": [
    {
      "number": 12,
      "type": "multiple_choice",
      "choices": [1, 2, 3, 4, 5],
      "correct_answer": 3,
      "points": 2,
      "question_path": "problems/국어/공통/12.txt",
      "image_paths": [
        "problems/images/국어/12_01.png",
        "problems/images/국어/12_02.png"
      ]
    }
  ]
}
```

### API Client Design

The system uses **API-specific clients** that handle different authentication and request formats:

1. **OpenAI-compatible APIs** (OpenAI, DeepSeek, Grok):
   - Use OpenAI Python SDK with configurable `base_url`
   - DeepSeek: `base_url="https://api.deepseek.com"`
   - Grok: `base_url="https://api.x.ai/v1"`
   - Images: base64-encoded with data URI scheme
   - MIME type auto-detection from file extensions

2. **Anthropic (Claude)**:
   - Uses Anthropic Python SDK
   - Supports Batch API for 50% cost savings (not yet implemented in solver)
   - Images: base64 in `source.data` field with `media_type`

3. **Google (Gemini)**:
   - Dual SDK support: modern `google.genai` and legacy `google-generativeai`
   - Images: PIL Image objects passed directly (SDK handles conversion)
   - Auto-detection and fallback between SDKs

### Configuration System

API credentials and settings are stored in `config.json` (git-ignored). See `config.example.json`:

```json
{
  "system_prompt": "당신은 한국 수능 문제를 푸는 AI입니다...",
  "models": [
    {
      "name": "GPT-5.1",
      "api_type": "openai",
      "api_key": "YOUR_KEY",
      "model_id": "gpt-5.1",
      "max_tokens": 128000,
      "temperature": 1.0,
      "rate_limit_rpm": 10
    },
    {
      "name": "DeepSeek-V3.2 Chat",
      "api_type": "deepseek",
      "api_key": "YOUR_KEY",
      "model_id": "deepseek-chat",
      "base_url": "https://api.deepseek.com",
      "max_tokens": 65536,
      "temperature": 1.0,
      "rate_limit_rpm": 10
    }
  ]
}
```

**Important**: `api_type` determines which client class to use. OpenAI-compatible types (`openai`, `deepseek`, `grok`) all use `OpenAIClient` with different `base_url` values.

### Running the API Solver

```bash
# List available models from config
python api_solver.py --list-models

# Solve questions for a specific subject and section
python api_solver.py --subject 국어 --section 공통

# Use specific models only
python api_solver.py --subject 수학 --section 확통 --models "GPT-5.1" "Gemini 2.5 Pro"

# Custom config and output files
python api_solver.py --config custom_config.json --output results_korean.json
```

Results are saved in JSON format with:
- Question numbers and model responses
- Answer extraction results
- Success/failure status and error messages
- Timestamps and raw API responses

### Model Capabilities Matrix

| Provider | Vision | Multiple Images | Batch API | OpenAI Compatible |
|----------|--------|-----------------|-----------|-------------------|
| OpenAI (GPT) | ✅ | ✅ | ❌ | Native |
| Anthropic (Claude) | ✅ | ✅ | ✅ | ❌ |
| Google (Gemini) | ✅ | ✅ (3600 max) | ❌ | ❌ |
| DeepSeek | ❌ | ❌ | ❌ | ✅ |
| Grok | ✅ | ✅ | ❌ | ✅ |

**Note**: DeepSeek does not support vision/images - questions with images will fail or be answered without visual context.

### Rate Limiting

Each model config has `rate_limit_rpm` (requests per minute). The `APIClient.rate_limit()` method enforces delays:
- Tracks last request time
- Calculates minimum interval: `60 / rate_limit_rpm`
- Sleeps if needed before next request

This prevents API quota errors and ensures respectful API usage.

### Adding New APIs

To add a new API provider:

1. **If OpenAI-compatible**: Just add to config with appropriate `base_url`
   ```json
   {
     "name": "NewModel",
     "api_type": "openai",  // or create new type
     "base_url": "https://api.newprovider.com/v1",
     "api_key": "...",
     "model_id": "model-name"
   }
   ```

2. **If custom protocol**: Create new client class inheriting `APIClient`
   - Implement `send_request(question, system_prompt) -> APIResponse`
   - Handle image encoding if supported
   - Add to `SATSolver._init_clients()` mapping

3. Update `ModelConfig.api_type` type hints

### Dependencies

```bash
# Core
pip install pandas openpyxl matplotlib numpy

# API clients (install as needed)
pip install openai           # OpenAI, DeepSeek, Grok
pip install anthropic        # Claude
pip install google-generativeai  # Gemini
pip install pillow           # Image handling
```

### Development Workflow

1. **Add questions**: Create text files and update `questions.json`
2. **Configure APIs**: Copy `config.example.json` to `config.json`, add keys
3. **Run solver**: `python api_solver.py --subject 국어 --section 공통`
4. **Manual entry**: Copy results to Excel file for visualization
5. **Generate charts**: `python generate_charts.py`

The API automation is designed for systematic testing but results must be manually transferred to Excel for chart generation (no automated integration yet).
