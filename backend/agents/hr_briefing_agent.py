"""
HR Briefing Agent - Transcribes and extracts key details from HR briefings
"""
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()


class HRBriefingAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="gpt-4",
            temperature=0.3,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.agent = Agent(
            role="HR Briefing Analyst",
            goal="Transcribe HR briefings, summarize key points, and extract critical hiring details",
            backstory="You are an expert at understanding HR briefings and extracting actionable information for recruiters. You can identify priorities, constraints, and special requirements mentioned in verbal briefings.",
            llm=self.llm,
            verbose=True
        )
    
    async def process_briefing(self, transcription: str) -> dict:
        """Process HR briefing transcription"""
        task = Task(
            description=f"""
            Analyze the following HR briefing transcription and extract key information:
            
            {transcription}
            
            Extract and return a JSON object with:
            {{
                "summary": "Brief summary of the briefing",
                "extracted_fields": {{
                    "priorities": ["string"],
                    "constraints": ["string"],
                    "special_requirements": ["string"],
                    "budget_notes": "string",
                    "timeline_notes": "string",
                    "team_dynamics": "string",
                    "culture_fit_notes": "string"
                }},
                "transcription": "{transcription}"
            }}
            """,
            agent=self.agent,
            expected_output="A JSON object with summary, extracted_fields (priorities, constraints, special_requirements, budget_notes, timeline_notes, team_dynamics, culture_fit_notes), and transcription"
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
            
            parsed_data = json.loads(json_str)
            parsed_data["transcription"] = transcription
            return parsed_data
        except:
            return {
                "summary": result[:500] if result else "",
                "extracted_fields": {},
                "transcription": transcription
            }

