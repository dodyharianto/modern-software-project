"""
Candidate Parser Agent - Extracts structured information from candidate resumes
"""
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()


class CandidateParserAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="gpt-4",
            temperature=0.3,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.agent = Agent(
            role="Resume Parser",
            goal="Extract structured information from candidate resumes including name, summary, skills, and experience",
            backstory="You are an expert at parsing resumes and extracting key candidate information. You can identify skills, experience levels, and career progression accurately.",
            llm=self.llm,
            verbose=True
        )
    
    async def parse_candidate(self, pdf_content: str) -> dict:
        """Parse candidate resume"""
        task = Task(
            description=f"""
            Parse the following candidate resume and extract structured information.
            
            IMPORTANT: The candidate's name is usually at the top of the resume. Extract it carefully.
            
            Resume content:
            {pdf_content}
            
            Extract and return a JSON object with:
            {{
                "name": "string (REQUIRED - extract the full name from the resume, usually at the top)",
                "summary": "string (professional summary or objective)",
                "skills": ["string"],
                "experience": "string (work experience description)",
                "parsed_insights": {{
                    "years_of_experience": "number",
                    "current_role": "string",
                    "education": "string",
                    "key_achievements": ["string"],
                    "languages": ["string"],
                    "certifications": ["string"]
                }}
            }}
            
            CRITICAL: Make sure to extract the candidate's FULL NAME. It is usually the first line or in the header of the resume.
            """,
            agent=self.agent,
            expected_output="A JSON object with name, summary, skills, experience, and parsed_insights fields"
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
            return parsed_data
        except:
            return {
                "name": "",
                "summary": result[:500] if result else "",
                "skills": [],
                "experience": "",
                "parsed_insights": {}
            }

