from pathlib import Path
import subprocess

root = Path('.')
src = root / 'artifacts/api-server/src/src'

# The existing NVIDIA adapter already contains the mature Right-hand case-file
# reasoning prompts and JSON contract. Re-home that implementation on Gemini's
# OpenAI-compatible API rather than replacing the reasoning behavior.
source = src / 'lib/nvidia-nim-case-reasoning.ts'
if not source.exists():
    raise SystemExit('Expected NVIDIA Right-hand adapter is missing.')

adapter = source.read_text(encoding='utf-8')
replacements = [
    ('https://integrate.api.nvidia.com/v1/chat/completions', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'),
    ('https://api.deepseek.com/chat/completions', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'),
    ('DEEPSEEK_CASE_REASONING_MODEL', 'GEMINI_RIGHT_HAND_MODEL'),
    ('DEEPSEEK_MODEL', 'GEMINI_RIGHT_HAND_MODEL'),
    ('deepseek-ai/deepseek-v4-flash-0731', 'gemini-3.8-flash'),
    ('deepseek-v4-flash-0731', 'gemini-3.8-flash'),
    ('deepseek-flash', 'gemini-3.8-flash'),
    ('getDeepSeekKey', 'getGeminiKey'),
    ('requestDeepSeekCompletion', 'requestGeminiCompletion'),
    ('getDeepSeekCaseReasoningStatus', 'getGeminiRightHandStatus'),
    ('runDeepSeekCaseReasoning', 'runGeminiRightHandCaseReasoning'),
    ('runDeepSeekDiscoveryAdvice', 'runGeminiRightHandDiscoveryAdvice'),
    ('runDeepSeekFreeJson', 'runGeminiRightHandFreeJson'),
    ('runDeepSeekFinalReview', 'runGeminiRightHandFinalReview'),
    ('DeepSeekCaseReasoningStatus', 'GeminiRightHandStatus'),
    ('DeepSeekCaseReasoningResult', 'GeminiRightHandCaseReasoningResult'),
    ('DeepSeekDiscoveryAdviceResult', 'GeminiRightHandDiscoveryAdviceResult'),
    ('DeepSeekResultAction', 'GeminiRightHandResultAction'),
    ('DeepSeek', 'GeminiRightHand'),
    ('deepseek', 'gemini-right-hand'),
    ('DEEPSEEK', 'GEMINI_RIGHT_HAND'),
]
for before, after in replacements:
    adapter = adapter.replace(before, after)

# Use the canonical Gemini API key already present in the provider contract.
adapter = adapter.replace('process.env.GEMINI_RIGHT_HAND_API_KEY', 'process.env.GEMINI_API_KEY')
adapter = adapter.replace('GEMINI_RIGHT_HAND_API_KEY is not configured', 'GEMINI_API_KEY is not configured')
(src / 'lib/gemini-right-hand-reasoning.ts').write_text(adapter, encoding='utf-8')

# Remove obsolete provider adapters; all active imports are rewritten below.
for obsolete in ('nvidia-nim-case-reasoning.ts', 'deepseek-case-reasoning.ts'):
    (src / 'lib' / obsolete).unlink(missing_ok=True)

# Update active application, checker, and workflow source so there is no live
# DeepSeek/NVIDIA Right-hand dependency left behind.
for base in (root / 'artifacts', root / 'scripts', root / '.github/workflows'):
    for path in base.rglob('*'):
        if not path.is_file() or path.suffix not in {'.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.yml', '.yaml'}:
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except Exception:
            continue
        updated = text
        for before, after in replacements:
            updated = updated.replace(before, after)
        lines = [line for line in updated.splitlines() if 'DEEPSEEK_API_KEY' not in line]
        updated = '\n'.join(lines) + ('\n' if updated.endswith('\n') else '')
        if updated != text:
            path.write_text(updated, encoding='utf-8')

# Retire temporary migration machinery and restore the known-good canonical audit workflow.
(root / 'scripts/migrate-right-hand-to-deepseek.mjs').unlink(missing_ok=True)
(root / '.github/workflows/migrate-right-hand-to-gemini.yml').unlink(missing_ok=True)
workflow = subprocess.check_output(['git', 'show', 'c5b45a0ad51f2d8f25c1363469f0f41da1102e74:.github/workflows/audit-five-greens.yml'])
(root / '.github/workflows/audit-five-greens.yml').write_bytes(workflow)
(root / 'scripts/migrate-right-hand-to-gemini.py').unlink(missing_ok=True)

# Active Apex must contain no DeepSeek or NVIDIA-hosted Right-hand implementation.
bad = []
for base in (root / 'artifacts', root / 'scripts', root / '.github/workflows'):
    for path in base.rglob('*'):
        if not path.is_file() or path.suffix in {'.lock'}:
            continue
        try:
            text = path.read_text(encoding='utf-8').lower()
        except Exception:
            continue
        if any(token in text for token in ('deepseek', 'deepseek_api_key', 'api.deepseek.com', 'deepseek-ai/', 'integrate.api.nvidia.com')):
            bad.append(str(path))
if bad:
    raise SystemExit('Obsolete Right-hand references remain in active Apex files: ' + ', '.join(bad[:30]))
