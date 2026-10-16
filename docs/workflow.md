# Workflow — 2-Day Vibe Loop (AnnBachao)

IDEA → RESEARCH → USER → PRD → STACK → ARCH → DESIGN → RULES → TASKS → SETUP → DEV → TEST → SEC REVIEW → CODE REVIEW → PREVIEW (compose) → QA → PROD (compose) → MONITOR (logs) → ITERATE

## Compressed loop per TASK (30–60 min)
1. READ relevant docs + existing file
2. UNDERSTAND acceptance criteria in TASKS.md
3. PLAN files to touch (≤3 files)
4. IMPLEMENT smallest vertical slice
5. TEST: curl + UI click + TEST_PLAN checkbox
6. REVIEW vs RULES/DESIGN/SECURITY (no new layer, no secrets)
7. FIX one by one
8. COMMIT `feat: TASK-00x ...` + update MEMORY.md
9. NEXT task

## Prompt template to use
CONTEXT (AnnBachao + docs) / TASK (TASK-00x) / FILES (paths) / CONSTRAINTS (gateway-only, validate, no unrelated edits) / ACCEPTANCE / TESTING (curl + UI). Report files changed, tests, issues.

## Never do
IDEA→AI→DEPLOY. Never build whole app in one prompt. Never trust client role. Never commit .env.
