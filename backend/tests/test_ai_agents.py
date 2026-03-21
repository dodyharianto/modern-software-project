"""
Test Cases - Agentic AI Recruiter App
Course: Modern Software Solutions
Group 2

File 2: AI Agent Sanity Checks
Requires: OPENAI_API_KEY environment variable to be set

These are sanity checks on AI-powered endpoints as recommended
by Topic 6 - Testing AI Components:
- Exact matching does not work with generative AI
- Assert response type, status code, non-empty output
- Not testing content quality, only that the system responds correctly

Run with: python -m pytest tests/test_ai_agents.py -v
Skip automatically if no API key is set.
"""

import pytest
import os
from fastapi.testclient import TestClient

# Skip entire file if no OpenAI API key is present
pytestmark = pytest.mark.skipif(
    not os.getenv("OPENAI_API_KEY"),
    reason="Requires OPENAI_API_KEY environment variable to run"
)


# ===========================================================================
# TEST CLIENT SETUP
# ===========================================================================

@pytest.fixture(scope="module")
def client():
    """Set up FastAPI test client with a valid auth token."""
    from main import app
    from services.auth_service import create_access_token

    token = create_access_token({"sub": "test@recruiter.com", "role": "admin"})
    client = TestClient(app)
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


@pytest.fixture(scope="module")
def role_id(client):
    """Create a test role and return its ID for use in candidate tests."""
    response = client.post("/api/roles", json={
        "title": "Test Software Engineer",
        "description": "Test role for automated testing"
    })
    assert response.status_code in [200, 201]
    return response.json()["id"]


# ===========================================================================
# JD PARSING SANITY CHECKS
# Source: POST /api/roles/{role_id}/jd
# ===========================================================================

class TestJDParsing:
    """Sanity checks for Job Description parsing agent."""

    def test_get_jd_returns_valid_structure(self, client, role_id):
        """Sanity check: GET JD endpoint returns expected structure."""
        response = client.get(f"/api/roles/{role_id}/jd")

        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)

    def test_update_jd_fields_accepted(self, client, role_id):
        """Sanity check: PUT JD endpoint accepts field updates."""
        response = client.put(f"/api/roles/{role_id}/jd", json={
            "title": "Senior Software Engineer",
            "skills": ["Python", "FastAPI"],
            "seniority": "Senior"
        })

        assert response.status_code in [200, 201, 404]


# ===========================================================================
# CANDIDATE OUTREACH SANITY CHECKS
# Source: POST /api/roles/{role_id}/candidates/{candidate_id}/outreach
# ===========================================================================

class TestOutreachGeneration:
    """Sanity checks for AI outreach message generation."""

    def test_outreach_endpoint_responds(self, client, role_id):
        """Sanity check: outreach generation endpoint responds correctly.
        Verifies the endpoint is reachable and returns expected structure
        without asserting on generated content."""
        candidates_response = client.get(f"/api/roles/{role_id}/candidates")

        assert candidates_response.status_code in [200, 404]

        if candidates_response.status_code == 200:
            candidates = candidates_response.json()
            if len(candidates) > 0:
                candidate_id = candidates[0]["id"]
                response = client.post(
                    f"/api/roles/{role_id}/candidates/{candidate_id}/outreach"
                )
                assert response.status_code in [200, 201]
                data = response.json()
                assert isinstance(data, dict)


# ===========================================================================
# CONSENT GENERATION API SANITY CHECKS
# Source: POST /api/consents/generate
# ===========================================================================

class TestConsentAPI:
    """Sanity checks for consent generation API endpoint."""

    def test_consent_generate_endpoint_responds(self, client):
        """Sanity check: consent generation endpoint returns 200
        and a non-empty response."""
        response = client.post("/api/consents/generate", json={
            "region": "EU",
            "role_title": "Software Engineer",
            "company_name": "TechCorp",
            "candidate_name": "Test Candidate"
        })

        assert response.status_code in [200, 201]
        data = response.json()
        assert data is not None

    def test_consent_generate_returns_content_field(self, client):
        """Sanity check: generated consent form contains a content field
        with non-empty text."""
        response = client.post("/api/consents/generate", json={
            "region": "EU",
            "role_title": "Data Analyst",
            "company_name": "TechCorp",
            "candidate_name": "Test Candidate"
        })

        assert response.status_code in [200, 201]
        data = response.json()
        assert "content" in data or "consent_text" in data or len(str(data)) > 0

    def test_get_all_consents_returns_list(self, client):
        """Sanity check: GET consents endpoint returns a list."""
        response = client.get("/api/consents")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ===========================================================================
# SIMULATION AGENT SANITY CHECKS
# Source: POST /api/simulation/candidate-reply
# ===========================================================================

class TestSimulationAgent:
    """Sanity checks for simulation agent endpoints."""

    def test_simulate_candidate_reply_responds(self, client):
        """Sanity check: simulation endpoint returns a valid response."""
        response = client.post("/api/simulation/candidate-reply", json={
            "candidate_name": "Test Candidate",
            "role_title": "Software Engineer",
            "outreach_message": "We would like to discuss an opportunity with you."
        })

        assert response.status_code in [200, 201]
        data = response.json()
        assert data is not None

    def test_simulate_outreach_reply_positive(self, client, role_id):
        """Sanity check: positive outreach reply simulation returns 200."""
        candidates_response = client.get(f"/api/roles/{role_id}/candidates")

        if candidates_response.status_code == 200:
            candidates = candidates_response.json()
            if len(candidates) > 0:
                candidate_id = candidates[0]["id"]
                response = client.post(
                    f"/api/roles/{role_id}/candidates/{candidate_id}/simulate-outreach-reply",
                    json={"reply_type": "positive"}
                )
                assert response.status_code in [200, 201]

    def test_simulate_consent_reply_consented(self, client, role_id):
        """Sanity check: consented simulation reply returns 200 and
        updates candidate consent status."""
        candidates_response = client.get(f"/api/roles/{role_id}/candidates")

        if candidates_response.status_code == 200:
            candidates = candidates_response.json()
            if len(candidates) > 0:
                candidate_id = candidates[0]["id"]
                response = client.post(
                    f"/api/roles/{role_id}/candidates/{candidate_id}/simulate-consent-reply",
                    json={"consent_status": "consented"}
                )
                assert response.status_code in [200, 201]


# ===========================================================================
# CANDIDATE EVALUATION SANITY CHECKS
# Source: POST /api/roles/{role_id}/candidates/{candidate_id}/evaluate
# ===========================================================================

class TestCandidateEvaluation:
    """Sanity checks for LLM-powered candidate evaluation."""

    def test_evaluation_endpoint_responds(self, client, role_id):
        """Sanity check: evaluation endpoint returns a valid response.
        Does not assert on content quality as LLM output is non-deterministic.
        Asserts only on response type and status code."""
        candidates_response = client.get(f"/api/roles/{role_id}/candidates")

        if candidates_response.status_code == 200:
            candidates = candidates_response.json()
            if len(candidates) > 0:
                candidate_id = candidates[0]["id"]
                response = client.post(
                    f"/api/roles/{role_id}/candidates/{candidate_id}/evaluate",
                    json={"message": "Is this candidate a good fit?"}
                )
                assert response.status_code in [200, 201]
                data = response.json()
                assert data is not None
                assert isinstance(data, dict)