"""
Simulation Agent - Simulates candidate replies and generates mock interview audio
"""
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()


class SimulationAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="gpt-4",
            temperature=0.8,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.agent = Agent(
            role="Candidate Simulator",
            goal="Simulate realistic candidate responses to outreach messages and generate mock interview content",
            backstory="You are an expert at simulating candidate behavior. You can generate realistic, varied responses that mimic how different candidates would reply to recruitment outreach.",
            llm=self.llm,
            verbose=True
        )
    
    async def generate_candidate_reply(self, simulation_params: dict) -> dict:
        """Generate simulated candidate reply"""
        candidate_name = simulation_params.get("candidate_name", "Candidate")
        candidate_profile = simulation_params.get("candidate_profile", "")
        outreach_message = simulation_params.get("outreach_message", "")
        reply_type = simulation_params.get("reply_type", "positive")  # positive, neutral, negative
        delay_days = simulation_params.get("delay_days", 0)
        
        sentiment_map = {
            "positive": "enthusiastic and interested",
            "neutral": "cautious but open to discussion",
            "negative": "polite but not interested"
        }
        
        task = Task(
            description=f"""
            Generate a realistic candidate email reply to a recruitment outreach message.
            
            Candidate Name: {candidate_name}
            Candidate Profile: {candidate_profile}
            
            Original Outreach Message:
            {outreach_message}
            
            Generate a reply that is {sentiment_map.get(reply_type, 'neutral')}.
            
            The reply should:
            1. Be professional and natural
            2. Match the candidate's profile and experience level
            3. Reflect the {reply_type} sentiment appropriately
            4. Be 2-4 sentences long
            5. Include appropriate email formatting
            
            Return a JSON object:
            {{
                "subject": "string",
                "body": "string",
                "sentiment": "{reply_type}",
                "delay_days": {delay_days}
            }}
            """,
            agent=self.agent,
            expected_output="A JSON object with subject, body (2-4 sentences), sentiment, and delay_days fields"
        )
        
        result = task.execute()
        # CrewAI may return TaskOutput or string; get string content
        if result is None:
            result_str = ""
        elif isinstance(result, str):
            result_str = result
        elif hasattr(result, "raw"):
            result_str = getattr(result, "raw", "") or ""
        elif hasattr(result, "result"):
            result_str = getattr(result, "result", "") or ""
        elif hasattr(result, "output"):
            result_str = getattr(result, "output", "") or ""
        else:
            result_str = str(result)

        import json
        try:
            if "```json" in result_str:
                json_str = result_str.split("```json")[1].split("```")[0].strip()
            elif "```" in result_str:
                json_str = result_str.split("```")[1].split("```")[0].strip()
            else:
                json_str = result_str.strip()
            if not json_str:
                raise ValueError("Empty JSON")
            return json.loads(json_str)
        except Exception:
            body = result_str.strip() if result_str else (
                "Thank you for reaching out. I'm very interested in learning more."
                if reply_type == "positive" else
                "Thank you for reaching out. I'm not looking to make a change at this time."
            )
            return {
                "subject": f"Re: {(outreach_message[:50] + '...') if len(outreach_message or '') > 50 else (outreach_message or 'Your outreach')}",
                "body": body,
                "sentiment": reply_type,
                "delay_days": delay_days
            }

