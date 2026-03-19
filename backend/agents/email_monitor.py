"""
Email Monitor Agent - Monitors email inbox for candidate replies
"""
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()


class EmailMonitorAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="gpt-4",
            temperature=0.2,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.agent = Agent(
            role="Email Sentiment Analyzer",
            goal="Analyze candidate email replies to determine if they are positive, negative, or neutral",
            backstory="You are an expert at understanding email tone and sentiment. You can quickly identify whether a candidate is interested, not interested, or needs more information.",
            llm=self.llm,
            verbose=True
        )
    
    async def analyze_email(self, email_content: str, candidate_name: str = None) -> dict:
        """Analyze email for sentiment and intent"""
        task = Task(
            description=f"""
            Analyze the following email from a candidate and determine:
            1. Sentiment: positive, negative, or neutral
            2. Intent: interested, not interested, or needs more info
            3. Key points mentioned
            
            Email content:
            {email_content}
            
            Candidate name: {candidate_name or 'Unknown'}
            
            Return a JSON object:
            {{
                "sentiment": "positive|negative|neutral",
                "intent": "interested|not_interested|needs_info",
                "key_points": ["string"],
                "recommended_action": "string"
            }}
            """,
            agent=self.agent,
            expected_output="A JSON object with sentiment (positive/negative/neutral), intent (interested/not_interested/needs_info), key_points array, and recommended_action"
        )
        
        result = task.execute()
        
        import json
        try:
            if "```json" in result:
                json_str = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                json_str = result.split("```")[1].split("```")[0].strip()
            else:
                json_str = result.strip()
            
            return json.loads(json_str)
        except:
            return {
                "sentiment": "neutral",
                "intent": "needs_info",
                "key_points": [],
                "recommended_action": "Follow up"
            }

