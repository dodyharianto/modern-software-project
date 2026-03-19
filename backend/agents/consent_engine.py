"""
Consent Engine Agent - Generates region-compliant consent forms
"""
import os
import uuid
import yaml
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()


class ConsentEngineAgent:
    """Generates consent forms compliant with regional regulations (GDPR, CCPA, PDPA, etc.)"""

    def __init__(self):
        self.rules_path = Path(__file__).parent.parent / "rules" / "consent_rules.yaml"
        self._rules = None

    def _load_rules(self) -> Dict[str, Any]:
        """Load consent rules from YAML"""
        if self._rules is None and self.rules_path.exists():
            with open(self.rules_path, "r") as f:
                self._rules = yaml.safe_load(f) or {}
        return self._rules or {}

    async def generate_consent(self, consent_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a consent form based on region and parameters.
        consent_params: { region, role_title?, company_name?, retention_months? }
        """
        rules = self._load_rules()
        region = consent_params.get("region", "default")
        region_config = rules.get("regions", {}).get(region, rules.get("regions", {}).get("default", {}))
        retention = consent_params.get("retention_months") or region_config.get("default_retention", "24 months")
        role_title = consent_params.get("role_title", "[Job Title]")
        company_name = consent_params.get("company_name", "[Company Name]")

        # Build consent content from required clauses
        required_clauses = region_config.get("required_clauses", [])
        regulations = region_config.get("regions", [region])

        clauses_text = "\n\n".join(f"- {c}" for c in required_clauses)
        content = f"""Thank you for your interest in the {role_title} role at {company_name}. To proceed, we require your consent under the applicable data protection regulations.

1. Purpose of Processing

Your personal data will be processed for:

- Assessing your application
- Contacting you regarding the hiring process
- Scheduling interviews

2. Optional Talent Pool Retention

If you choose to join our talent pool, we will retain your information for up to {retention} to notify you about future opportunities.

3. Data Transfers

Your data may be stored on servers outside your region. When this occurs, we apply appropriate safeguards (e.g., SCCs or adequacy decisions).

4. Your Rights

You may withdraw at any time or request deletion by contacting us at [Contact Email].

5. Consent Statement

Please reply with one of the following:

"I AGREE – recruitment only"

"I AGREE – recruitment + talent pool"

"I DECLINE"

Thank you,
[Recruiter / Company Name]"""

        content_id = str(uuid.uuid4())
        return {
            "id": content_id,
            "name": f"{region} Consent Form",
            "content": content,
            "region": region,
            "retention": retention,
        }
