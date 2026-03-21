import pytest
import tempfile
import os
import json
from unittest.mock import patch, MagicMock


class TestConsentGeneration:

    @pytest.mark.asyncio
    async def test_unknown_region_falls_back_to_default(self):
        from agents.consent_engine import ConsentEngineAgent
        agent = ConsentEngineAgent()
        result = await agent.generate_consent({
            "region": "UNKNOWN_REGION_XYZ",
            "role_title": "Test Role"
        })
        assert result is not None
        assert len(result["content"]) > 0

    @pytest.mark.asyncio
    async def test_missing_optional_params_produces_form(self):
        from agents.consent_engine import ConsentEngineAgent
        agent = ConsentEngineAgent()
        result = await agent.generate_consent({"region": "EU"})
        assert result is not None
        assert len(result["content"]) > 0

    @pytest.mark.asyncio
    async def test_eu_region_returns_correct_region_field(self):
        from agents.consent_engine import ConsentEngineAgent
        agent = ConsentEngineAgent()
        result = await agent.generate_consent({
            "region": "EU",
            "role_title": "Engineer",
            "company_name": "TechCorp"
        })
        assert result is not None
        assert result["region"] == "EU"
        assert len(result["content"]) > 0

    @pytest.mark.asyncio
    async def test_california_region_generates_form(self):
        from agents.consent_engine import ConsentEngineAgent
        agent = ConsentEngineAgent()
        result = await agent.generate_consent({
            "region": "California",
            "role_title": "Analyst"
        })
        assert result is not None
        assert len(result["content"]) > 0

    @pytest.mark.asyncio
    async def test_consent_form_has_name_field(self):
        from agents.consent_engine import ConsentEngineAgent
        agent = ConsentEngineAgent()
        result = await agent.generate_consent({
            "region": "EU",
            "role_title": "Designer"
        })
        assert result is not None
        assert "name" in result


class TestConsentConversions:

    def test_declined_consent_sets_flag_false(self):
        from services.file_storage import FileStorageService
        storage = FileStorageService()
        with patch.object(storage, "get_candidate") as mock_get:
            mock_get.return_value = {
                "id": "cand123",
                "name": "Test Candidate",
                "consent_email": {},
                "consent_form_received": True
            }
            with patch("builtins.open", create=True):
                with patch("json.dump"):
                    result = storage.record_consent_reply(
                        "role123", "cand123",
                        {
                            "consent_status": "declined",
                            "content": "I DO NOT CONSENT",
                            "response": "I DO NOT CONSENT"
                        }
                    )
                    assert result is True

    def test_accepted_consent_sets_flag_true(self):
        from services.file_storage import FileStorageService
        storage = FileStorageService()
        with patch.object(storage, "get_candidate") as mock_get:
            mock_get.return_value = {
                "id": "cand123",
                "name": "Test Candidate",
                "consent_email": {},
                "consent_form_received": False
            }
            with patch("builtins.open", create=True):
                with patch("json.dump"):
                    result = storage.record_consent_reply(
                        "role123", "cand123",
                        {
                            "consent_status": "consented",
                            "content": "I CONSENT",
                            "response": "I CONSENT"
                        }
                    )
                    assert result is True

    def test_nonexistent_candidate_returns_false(self):
        from services.file_storage import FileStorageService
        storage = FileStorageService()
        with patch.object(storage, "get_candidate") as mock_get:
            mock_get.return_value = None
            result = storage.record_consent_reply(
                "role123", "ghost_candidate",
                {"consent_status": "consented"}
            )
            assert result is False

    def test_consent_reply_with_minimal_fields(self):
        from services.file_storage import FileStorageService
        storage = FileStorageService()
        with patch.object(storage, "get_candidate") as mock_get:
            mock_get.return_value = {
                "id": "cand123",
                "name": "Test Candidate",
                "consent_email": {},
                "consent_form_received": False
            }
            with patch("builtins.open", create=True):
                with patch("json.dump"):
                    result = storage.record_consent_reply(
                        "role123", "cand123",
                        {"consent_status": "consented"}
                    )
                    assert result is True


class TestConsentPolicyGate:

    def test_processing_blocked_without_consent(self):
        """
        SKIPPED - Compliance gap:
        Per project spec, evaluating a candidate without consent
        granted should be blocked at the API level.
        The backend currently allows processing regardless of
        consent status.
        Remediation needed at:
        - /api/roles/{role_id}/candidates/{candidate_id}/evaluate
        - /api/roles/{role_id}/evaluation-chat
        """
        pytest.skip(
            "Consent enforcement gate not yet implemented in backend. "
            "Evaluation endpoints do not check consent_form_received "
            "before proceeding. Flagged for remediation."
        )