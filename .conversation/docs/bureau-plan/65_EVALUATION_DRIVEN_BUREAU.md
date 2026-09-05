# Volume 65 — Evaluation-Driven Bureau Development

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Research anchors:** LLM agent evaluation surveys (task success, tool selection accuracy, process vs outcome); Evaluation-driven Development; warnings that pass-rate alone hides “lucky” trajectories.

## 1. Outcome vs process

Agent literature increasingly separates:

- **Outcome success** — final answer / card looks right  
- **Process quality** — trajectory used tools sensibly, did not blindly retry, verified  

Apex needs both:

| Dimension | Metric |
|-----------|--------|
| Outcome | Scoreboard vs independent primary sources (Vol 16/63) |
| Process | Free-dig evidence (invented queries, visits); no force_*; spans complete |
| Honesty | Org vs personal labeling |
| Operability | status/healthz under load |

A “lucky” full registry crawl that stamps issuer phones is **outcome theater**, not process quality.

## 2. Tool-use metrics (adapted)

From tool-use evaluation practice:

| Metric | Apex measurement |
|--------|------------------|
| Tool invocation appropriateness | Model chose search/visit when card empty |
| Tool selection | Chose registry when identity unknown; browser when CF blocks |
| Argument quality | Query contains person or company tokens |
| Execution success | Tool returned non-error observation |
| Downstream use | Findings merged and promoted |

## 3. Regression cadence (EDD)

| When | What |
|------|------|
| Every dig/promote PR | Unit tests Vol 26 promote/identity |
| Every tip to Replit | Anti-script grep Vol 15 |
| Weekly | Fixture scoreboard 8+ names |
| After “big” UI week | Still require scoreboard — UI ≠ win |

## 4. Ranking rule for tips

Prefer tip with higher **scoreboard wins + honesty**, not higher commit count.  
If pass-rate on dig “completed” is high but empty-after-dig is high, rank tip **down**.

## 5. Apex must / must not

**Must:** ship scoreboard files with tip SHA.  
**Must not:** equate job completed=true with research quality.
