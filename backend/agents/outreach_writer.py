"""
Outreach Writer Agent - Generates deeply personalized outreach messages for candidates
"""
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()


class OutreachWriterAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="gpt-4",
            temperature=0.8,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.agent = Agent(
            role="Senior Recruiter & Outreach Specialist",
            goal="Craft highly personalized, thoughtful outreach that sounds like it was written by a human recruiter who has genuinely studied the candidate—never generic or template-like.",
            backstory="""You are an experienced recruiter who takes pride in writing outreach that candidates actually want to read.
            You avoid clichés like 'I came across your profile' or 'I hope this finds you well.' You reference specific details:
            projects, achievements, career moves, or skills that show you've actually read their background.
            Your messages feel like a thoughtful note from a real person, not a mass email. You never sound salesy or robotic.""",
            llm=self.llm,
            verbose=True
        )
    
    async def generate_outreach(
        self,
        role: dict,
        candidate: dict,
        jd: dict = None,
        briefing: dict = None,
        recruiter_notes: str = "",
    ) -> str:
        """Generate deeply personalized outreach message"""
        jd_text = ""
        if jd:
            reqs = jd.get("requirements", [])
            if isinstance(reqs, list):
                reqs = ", ".join(str(r) for r in reqs)
            jd_text = f"""
            Job Title: {jd.get('job_title', '')}
            Summary: {jd.get('job_summary', '')}
            Requirements: {reqs}
            """
        
        briefing_text = ""
        if briefing:
            briefing_text = f"""
            HR Briefing (use for context, priorities, team fit):
            Summary: {briefing.get('summary', '')}
            Key points: {briefing.get('extracted_fields', {})}
            """
        
        insights = candidate.get("parsed_insights", {}) or {}
        insights_text = "\n".join(f"  - {k}: {v}" for k, v in insights.items() if v)
        
        recruiter_hints = ""
        if recruiter_notes and recruiter_notes.strip():
            recruiter_hints = f"""
            Recruiter's personal notes / customization hints (incorporate these naturally):
            {recruiter_notes.strip()}
            """
        
        task = Task(
            description=f"""
            Write a personalized outreach message for this candidate. The message must sound like it was crafted by a real recruiter who has studied their profile—NOT a generic template.

            CANDIDATE (study these details; reference specifics):
            Name: {candidate.get('name', '')}
            Summary: {candidate.get('summary', '')}
            Experience: {candidate.get('experience', '')[:500]}...
            Skills: {', '.join((candidate.get('skills') or [])[:15])}
            Parsed insights:
            {insights_text}

            ROLE: {role.get('title', '')}
            {jd_text}
            {briefing_text}
            {recruiter_hints}

            REQUIREMENTS (strict):
            - Reference at least one SPECIFIC thing from their profile (project, role, skill, achievement)—show you've read it
            - NO generic openers: avoid "I came across your profile", "I hope this finds you well", "I was impressed by"
            - Write 2-3 short paragraphs, conversational tone
            - Sound like a human, not a bot. Vary sentence structure.
            - End with a clear, low-pressure ask (e.g. open to a quick chat?)
            - Return ONLY the message text, no subject line, no JSON, no formatting
            """,
            agent=self.agent,
            expected_output="A personalized outreach message as plain text (2-3 paragraphs)"
        )
        
        result = task.execute()
        return result.strip()

    async def generate_recruiter_notes(
        self,
        role: dict,
        candidate: dict,
        jd: dict = None,
        briefing: dict = None,
    ) -> str:
        """Generate suggested recruiter notes / customization hints for outreach"""
        jd_text = ""
        if jd:
            jd_text = f"Role: {role.get('title', '')}. JD: {jd.get('job_title', '')} - {jd.get('job_summary', '')[:200]}"
        briefing_text = briefing.get("summary", "")[:300] if briefing else ""
        insights = candidate.get("parsed_insights", {}) or {}
        insights_text = ", ".join(f"{k}: {v}" for k, v in list(insights.items())[:5] if v)

        task = Task(
            description=f"""
            A recruiter is about to write outreach to this candidate. Suggest 2-4 brief, actionable notes they could add to personalize the message.
            Output as a short bullet list or comma-separated hints. Be specific to this candidate.

            Candidate: {candidate.get('name', '')}
            Summary: {candidate.get('summary', '')[:300]}
            Experience: {candidate.get('experience', '')[:300]}
            Skills: {', '.join((candidate.get('skills') or [])[:10])}
            Insights: {insights_text}

            {jd_text}
            {f"HR context: {briefing_text}" if briefing_text else ""}

            Return ONLY the suggested notes (2-4 short bullets or phrases), no preamble.
            """,
            agent=self.agent,
            expected_output="2-4 short personalization hints as plain text",
        )
        result = task.execute()
        return result.strip()

