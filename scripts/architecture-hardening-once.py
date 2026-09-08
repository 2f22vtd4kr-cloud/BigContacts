from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text()

def write(path, text):
    (ROOT / path).write_text(text)

def remove_function(text, signature_regex):
    m = re.search(signature_regex, text)
    if not m:
        raise RuntimeError(f"required function not found: {signature_regex}")
    brace = text.find('{', m.end())
    if brace < 0:
        raise RuntimeError(f"function body not found: {signature_regex}")
    depth = 0
    in_str = None
    escaped = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if c == '\n': line_comment = False
        elif block_comment:
            if c == '*' and n == '/': block_comment = False; i += 1
        elif in_str:
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == in_str: in_str = None
        else:
            if c == '/' and n == '/': line_comment = True; i += 1
            elif c == '/' and n == '*': block_comment = True; i += 1
            elif c in ('"', "'", '`'): in_str = c
            elif c == '{': depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    while end < len(text) and text[end] in ' \t': end += 1
                    if text[end:end+1] == '\n': end += 1
                    return text[:m.start()] + text[end:]
        i += 1
    raise RuntimeError(f"unbalanced function body: {signature_regex}")

def remove_call(text, pattern):
    out, count = re.subn(pattern, '', text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"required call not found exactly once: {pattern}")
    return out

# 1. Groq remains an Investigator only: remove the legacy final-review fallback.
p = 'artifacts/api-server/src/lib/ai-extractor.ts'
s = read(p)
pattern = r'\n  // 3\) Groq capacity fallback \(multi-model\).*?\n  return adjudicateFinalTargetReview\(input, \{\}, "unavailable-final-review"\);'
replacement = '\n  // No investigator provider is allowed to replace Gemini Boss/NVIDIA final review.\n  // If both oversight layers are unavailable, the deterministic adjudicator receives\n  // an empty model decision and therefore fail-closes without publishing a card.\n  return adjudicateFinalTargetReview(input, {}, "unavailable-final-review");'
s2, count = re.subn(pattern, replacement, s, count=1, flags=re.S)
if count != 1:
    raise RuntimeError('ai-extractor final Groq fallback block not found exactly once')
write(p, s2)

# 2. Legacy evidence->card projector: remove the automatic call and all rehydrate/promote APIs.
p = 'artifacts/api-server/src/src/lib/bureau-contact-persist.ts'
s = read(p)
call_pattern = r'\n  // Dig bag → card: promote best non-issuer phone/email onto the entity so\n  // free agentic findings are not stranded as evidence_only while EDGAR-Phone stays\.\n  try \{\n  await promoteBureauContactsToEntityCard\(entityId, items \?\? \[\], source, jobId\);\n  \} catch \(err\) \{\n    logger\.debug\(\n      \{ err: err instanceof Error \? err\.message : String\(err\), entityId \},\n      "promoteBureauContactsToEntityCard skipped",\n    \);\n  \}'
s2, count = re.subn(call_pattern, '', s, count=1)
if count != 1:
    raise RuntimeError('automatic bureau evidence->card promotion call not found exactly once')
s = s2
s = remove_function(s, r'async function promoteBureauContactsToEntityCard\s*\(')
s = remove_function(s, r'export async function rehydrateEntityCardFromEvidence\s*\(')
s = remove_function(s, r'export async function rehydrateAllEntityCardsFromEvidence\s*\(')
write(p, s)

# 3. Remove legacy rehydrate imports/calls from research cases and Atlas orchestrator.
for p in [
    'artifacts/api-server/src/src/routes/research/cases.ts',
    'artifacts/api-server/src/src/lib/atlas-orchestrator.ts',
]:
    s = read(p)
    s2 = re.sub(r'\n\s*rehydrateEntityCardFromEvidence,', '', s, count=1)
    if s2 == s:
        raise RuntimeError(f'rehydrate import not found in {p}')
    s = s2
    s = re.sub(r'\n\s*try \{\s*await rehydrateEntityCardFromEvidence\(entity\.id\);\s*\} catch \{ /\* non-fatal \*/ \}', '', s, count=1, flags=re.S) if p.endswith('cases.ts') else re.sub(r'\n\s*// Promotion is evidence/card mapping, not a research-path gate\. Preserve\s*\n\s*// any valid source-backed evidence even when the investigator stops on a\s*\n\s*// budget/timeout boundary; terminal integrity remains visible separately\.\s*\n\s*const rehydrated = await rehydrateEntityCardFromEvidence\(entity\.id\);\s*\n\s*if \(rehydrated\) \{\s*\n\s*await db\.update\(entitiesTable\)\.set\(\{\s*\n\s*cookedAt: new Date\(\),', '\n      // Evidence persistence is independent of card publication.\n', s, count=1, flags=re.S)
    write(p, s)

# 4. Remove the public rehydrate endpoint; durable evidence must not become a card by GET/POST backfill.
p = 'artifacts/api-server/src/src/routes/entities.ts'
s = read(p)
marker = '// POST /entities/rehydrate-contacts'
start = s.find(marker)
if start < 0:
    raise RuntimeError('legacy entity rehydrate route marker not found')
router_pos = s.find('router.post(', start)
if router_pos < 0:
    raise RuntimeError('legacy entity rehydrate router.post not found')
brace = s.find('{', router_pos)
depth = 0
in_str = None
escaped = False
i = brace
while i < len(s):
    c = s[i]; n = s[i+1] if i+1 < len(s) else ''
    if in_str:
        if escaped: escaped = False
        elif c == '\\': escaped = True
        elif c == in_str: in_str = None
    else:
        if c in ('"', "'", '`'): in_str = c
        elif c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                if end < len(s) and s[end] == ';': end += 1
                if end < len(s) and s[end] == '\n': end += 1
                s = s[:start] + s[end:]
                break
    i += 1
else:
    raise RuntimeError('could not balance legacy entity rehydrate route')
write(p, s)

# 5. Extend the architecture guard so these legacy bypasses cannot silently return.
p = 'scripts/check-unified-investigator-architecture.mjs'
s = read(p)
s = s.replace('  finalReview: path.join(root, "artifacts/api-server/src/lib/ai-extractor.ts"),', '  finalReview: path.join(root, "artifacts/api-server/src/lib/ai-extractor.ts"),\n  persistence: path.join(root, "artifacts/api-server/src/src/lib/bureau-contact-persist.ts"),')
needle = 'assert(!/groq-final-review-fallback|Boss \\(Gemini\\\\).*NVIDIA.*Groq|Final card publication review.*Groq/i.test(source.finalReview), "Groq is still exposed as a final card review/decision layer.");'
if needle not in s:
    # Use a simpler insertion anchor that is stable in the current guard.
    anchor = 'assert(!/groq-final-review-fallback|Boss \\(Gemini\\).*NVIDIA.*Groq|Final card publication review.*Groq/i.test(source.finalReview), "Groq is still exposed as a final card review/decision layer.");'
    if anchor not in s:
        raise RuntimeError('final-review guard anchor not found')
    needle = anchor
s = s.replace(needle, needle + '\n\n// Evidence is not a card: legacy durable-evidence rehydration/projectors are forbidden.\nassert(!/promoteBureauContactsToEntityCard|rehydrateEntityCardFromEvidence|rehydrateAllEntityCardsFromEvidence/.test(source.persistence), "Legacy bureau evidence-to-card projector/rehydration API remains present.");\nassert(!/rehydrateEntityCardFromEvidence|rehydrateAllEntityCardsFromEvidence/.test(source.cases + source.research), "Legacy evidence-only rehydration remains reachable from the research path.");')
write(p, s)

print('ARCHITECTURE HARDENING TRANSFORM: PASS')
