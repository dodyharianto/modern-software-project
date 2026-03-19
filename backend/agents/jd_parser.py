"""
JD Parser Agent - Extracts structured information from job descriptions
"""
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()


class JDParserAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="gpt-4",
            temperature=0.3,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.agent = Agent(
            role="JD Parser",
            goal="Extract structured information from job descriptions including job title, summary, responsibilities, and requirements",
            backstory="You are an expert at parsing and extracting structured information from job descriptions. You understand the nuances of different job postings and can identify key sections accurately.",
            llm=self.llm,
            verbose=True
        )
    
    async def parse_jd(self, pdf_content: str) -> dict:
        """Parse JD and extract structured information"""
        task = Task(
            description=f"""
            Parse the following job description and extract structured information:
            
            {pdf_content}
            
            Extract and return a JSON object with the following structure:
            {{
                "job_title": "string",
                "job_summary": "string",
                "responsibilities": ["string"],
                "requirements": ["string"],
                "skills": ["string"],
                "experience_level": "string",
                "location": "string",
                "employment_type": "string"
            }}
            """,
            agent=self.agent,
            expected_output="A JSON object with job_title, job_summary, responsibilities, requirements, skills, experience_level, location, and employment_type fields"
        )
        
        result = task.execute()
        
        # Parse the result (assuming it's JSON)
        import json
        try:
            # Try to extract JSON from the result
            if "```json" in result:
                json_str = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                json_str = result.split("```")[1].split("```")[0].strip()
            else:
                json_str = result.strip()
            
            parsed_data = json.loads(json_str)
            return parsed_data
        except:
            # Fallback: return structured dict with raw result
            return {
                "job_title": "",
                "job_summary": result[:500] if result else "",
                "responsibilities": [],
                "requirements": [],
                "skills": [],
                "experience_level": "",
                "location": "",
                "employment_type": "",
                "raw_content": result
            }

