# Test Suite - Agentic AI Recruiter App

## Overview

Tests are split into two files based on external dependencies.
Manual testing was conducted for AI-powered features that cannot
be reliably tested with automated assertions.

---

## File 1: test_consent.py
No external dependencies required.
Tests core consent management logic in isolation.

Run with:
    python -m pytest tests/test_consent.py -v

Expected results:
- 9 PASSED  : Consent generation and reply tracking logic works correctly
- 1 SKIPPED : Consent enforcement gate not yet implemented (compliance gap)

### What is tested

- Consent form generation for EU region
- Consent form generation for California region
- Unknown region falls back to default rules without crashing
- Missing optional params produce a form with placeholder text
- Consent form contains required name field
- Declined consent correctly sets consent_form_received to False
- Accepted consent correctly sets consent_form_received to True
- Nonexistent candidate returns False without crashing
- Consent reply with minimal fields does not crash

---

## File 2: test_ai_agents.py
Requires OPENAI_API_KEY environment variable to be set.
Sanity checks on AI-powered API endpoints.
All tests skip automatically if no API key is present.

Run with:
    set OPENAI_API_KEY=your_key_here
    python -m pytest tests/test_ai_agents.py -v

Expected results (with API key):
- 12 sanity checks covering JD parsing, outreach generation,
  consent API, simulation agent, and candidate evaluation
- Asserts response type and status code only
- Does not assert on AI generated content as LLM output
  is non-deterministic

### What is tested

- JD endpoint returns valid structure on GET and PUT
- Outreach generation endpoint responds with correct type
- Consent generation API returns 200 and non-empty response
- Consent generation returns a content field
- GET consents returns a list
- Simulation candidate reply endpoint responds correctly
- Positive outreach reply simulation returns 200
- Consented simulation reply returns 200
- Candidate evaluation endpoint responds with correct type

---

## Run All Tests
    python -m pytest tests/ -v

---

## Manual Testing - AI Agent Outputs

AI-powered features were manually tested by running the application
and evaluating outputs visually. This approach is justified by
Topic 6 which states that exact matching does not work with
generative AI and that eyeballing results is an accepted approach.

### Features Manually Tested

| Feature | How Tested | Result |
|---|---|---|
| JD Parsing | Uploaded a real JD PDF, verified extracted skills and seniority | Pass |
| HR Briefing | Uploaded audio briefing, verified transcription and key details | Pass |
| Candidate Ranking | Uploaded 3 candidate profiles, verified ranking with explanations | Pass |
| Outreach Generation | Triggered outreach for a candidate, verified personalized message | Pass |
| Interview Analysis | Uploaded interview audio, verified structured summary output | Pass |
| Candidate Evaluation | Used chat interface, verified relevant response to queries | Pass |
| Simulation Agent | Triggered mock replies, verified positive and negative handling | Pass |

### What Was Checked

- Response is non-empty and relevant to the input
- No hallucinated or nonsensical content
- Output format matches expected structure
- System does not crash on valid inputs

### What Was Not Checked

- Exact wording of AI generated content
- Consistency across multiple runs
- Performance under load

---

## Key Findings from Testing

### Finding 1 - Consent Enforcement Gate Not Implemented
The backend tracks consent_form_received as a flag but does
not block processing if consent is declined. This is a
compliance risk as the project spec states processing should
be blocked if consent is not granted.

Affects:
- /api/roles/{role_id}/candidates/{candidate_id}/evaluate
- /api/roles/{role_id}/evaluation-chat

Status: Flagged for remediation.

### Finding 2 - Auth Service Tight Coupling
services/auth_service.py uses hardcoded backend. prefix imports
making it untestable in isolation without the full app running.
The same pattern exists in models/__init__.py and db/db.py.

Status: Architectural finding, documented for awareness.

---

## Coverage Limitations

This test suite is not comprehensive. It was never intended to be.
Test coverage is intentionally scoped to the most critical and
testable components given the constraints of the project.

### What is Not Covered

| Area | Reason Not Covered |
|---|---|
| Authentication (login, JWT, roles) | Auth service tightly coupled to full app, untestable in isolation |
| Candidate pipeline (upload, rank, status) | Requires live OpenAI API and candidate data |
| HR Briefing and Interview transcription | Requires physical audio files and Whisper |
| PDF parsing | Requires physical PDF files |
| Frontend components | No frontend test framework configured |
| Full integration flows | No end-to-end tests from JD upload to evaluation |

### Recommended Next Steps Before Production

- Fix auth service coupling to enable isolated unit testing
- Add integration tests for the full candidate pipeline flow
- Implement the consent enforcement gate and add a passing test
- Set up end-to-end testing using a tool like Playwright or Cypress
- Add regression tests to ensure fixed bugs stay fixed

---

## Testing Approach

Based on Topic 6 - Software Quality 1 (SMU IS631):

- File 1 uses blackbox and whitebox testing with input
  partitioning and boundary values applied to consent logic
- File 2 uses sanity checks as recommended for AI components
  where exact output matching is not feasible
- Manual testing and eyeballing used for audio and PDF
  processing features which require physical files and
  live API responses
- Exhaustive testing is not the goal — test cases were
  chosen carefully and systematically to cover the most
  critical paths and highest compliance risk areas
- Full integration and end-to-end testing is recommended
  as a next step before production deployment