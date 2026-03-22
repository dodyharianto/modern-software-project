"""
Email Monitoring Service
========================
Monitors candidate email inboxes (Gmail / Outlook) for replies to outreach
messages and routes them to the EmailMonitorAgent for AI-powered sentiment
analysis.

Current status: Placeholder structure.
Full production use requires OAuth 2.0 credentials for each provider.
Refer to GMAIL_SETUP.md for step-by-step OAuth configuration instructions.

Authors : Modern Software Solutions — IS631 Group Project
Version : 1.0.0
"""

import os
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file so credentials are never
# hard-coded in source code.
load_dotenv()

# Supported email providers and their display names.
# Extend this dict when adding new provider integrations (e.g. Yahoo, IMAP).
SUPPORTED_PROVIDERS: Dict[str, str] = {
    "gmail": "Google Gmail (OAuth 2.0)",
    "outlook": "Microsoft Outlook / Office 365 (OAuth 2.0)",
}


class EmailMonitorService:
    """
    Service layer for email inbox monitoring.

    Wraps provider-specific OAuth flows and exposes a uniform async interface
    so the rest of the application stays provider-agnostic.  The Strategy
    pattern used in the storage layer is mirrored here — swap providers via
    the `provider` argument without changing call sites.

    Environment variables required (see .env.example):
        GMAIL_CLIENT_ID       — Google OAuth 2.0 client ID
        GMAIL_CLIENT_SECRET   — Google OAuth 2.0 client secret
        OUTLOOK_CLIENT_ID     — Microsoft Azure app client ID
        OUTLOOK_CLIENT_SECRET — Microsoft Azure app client secret
    """

    def __init__(self):
        # --- Gmail credentials (loaded from environment, never hard-coded) ---
        self.gmail_client_id = os.getenv("GMAIL_CLIENT_ID")
        self.gmail_client_secret = os.getenv("GMAIL_CLIENT_SECRET")

        # --- Outlook / Office 365 credentials ---
        self.outlook_client_id = os.getenv("OUTLOOK_CLIENT_ID")
        self.outlook_client_secret = os.getenv("OUTLOOK_CLIENT_SECRET")

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def get_supported_providers(self) -> Dict[str, str]:
        """
        Return the map of provider keys to human-readable display names.

        Usage example:
            service = EmailMonitorService()
            print(service.get_supported_providers())
            # {'gmail': 'Google Gmail (OAuth 2.0)', 'outlook': '...'}

        Returns:
            Dict[str, str]: provider_key -> display_name
        """
        return SUPPORTED_PROVIDERS

    # ------------------------------------------------------------------
    # Core async methods
    # ------------------------------------------------------------------

    async def check_emails(self, provider: str = "gmail") -> List[Dict[str, Any]]:
        """
        Poll the specified email provider for new candidate reply emails.

        Production implementation steps (not yet active):
            1. Exchange stored refresh token for a short-lived access token
               via the provider's OAuth 2.0 token endpoint.
            2. Call the provider's REST API (Gmail: messages.list /
               Outlook: /me/messages) to fetch unread messages.
            3. Filter messages by subject-line patterns or sender addresses
               that match known outreach threads.
            4. Normalise each message into a common dict schema (see Returns).
            5. Optionally pass each message to `analyze_email_sentiment()`
               before returning.

        Args:
            provider (str): Email provider to query. Must be one of the keys
                            in SUPPORTED_PROVIDERS. Defaults to "gmail".

        Returns:
            List[Dict[str, Any]]: List of email dicts, each containing:
                {
                    "id"        : str,   # provider message ID
                    "sender"    : str,   # reply-from address
                    "subject"   : str,
                    "body"      : str,   # plain-text body
                    "received"  : str,   # ISO-8601 timestamp
                    "thread_id" : str,   # link back to outreach thread
                }
            Returns an empty list until OAuth integration is complete.
        """
        # Validate the requested provider against the supported list
        if provider not in SUPPORTED_PROVIDERS:
            raise ValueError(
                f"Unsupported provider '{provider}'. "
                f"Choose from: {list(SUPPORTED_PROVIDERS.keys())}"
            )

        # --- Placeholder: replace the block below with live API calls ---
        # Step 1: authenticate(provider)  → access_token
        # Step 2: fetch_messages(access_token) → raw_messages
        # Step 3: filter_candidate_replies(raw_messages) → filtered
        # Step 4: normalise(filtered) → List[Dict]
        # -----------------------------------------------------------------
        return []

    async def analyze_email_sentiment(
        self,
        email_content: str,
        candidate_name: str = None,
    ) -> Dict[str, Any]:
        """
        Delegate email content to the EmailMonitorAgent for AI sentiment
        analysis (positive / neutral / negative reply classification).

        This method is intentionally thin — it keeps the service layer
        decoupled from agent internals so the agent can be swapped or
        upgraded independently.

        Args:
            email_content  (str) : Plain-text body of the candidate email.
            candidate_name (str) : Optional name for personalised analysis
                                   context. Defaults to None.

        Returns:
            Dict[str, Any]: Sentiment result from the agent, typically:
                {
                    "sentiment" : "positive" | "neutral" | "negative",
                    "summary"   : str,   # one-line AI summary
                    "action"    : str,   # suggested next step
                }
        """
        # Lazy import avoids a circular-dependency issue at module load time.
        from agents.email_monitor import EmailMonitorAgent

        agent = EmailMonitorAgent()
        return await agent.analyze_email(email_content, candidate_name)

