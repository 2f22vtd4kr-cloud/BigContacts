from pathlib import Path

root = Path('.')
src = root / 'artifacts/api-server/src/src'
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
adapter = adapter.replace('process.env.GEMINI_RIGHT_HAND_API_KEY', 'process.env.GEMINI_API_KEY')
adapter = adapter.replace('GEMINI_RIGHT_HAND_API_KEY is not configured', 'GEMINI_API_KEY is not configured')
(src / 'lib/gemini-right-hand-reasoning.ts').write_text(adapter, encoding='utf-8')

for obsolete in ('nvidia-nim-case-reasoning.ts', 'deepseek-case-reasoning.ts'):
    (src / 'lib' / obsolete).unlink(missing_ok=True)

# Only source/checker scripts are rewritten here. Workflow files are deliberately
# untouched because the GitHub Actions token cannot push workflow-file changes.
for base in (root / 'artifacts', root / 'scripts'):
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

bad = []
for base in (root / 'artifacts', root / 'scripts'):
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
    raise SystemExit('Obsolete Right-hand references remain in active Apex source: ' + ', '.join(bad[:30]))
