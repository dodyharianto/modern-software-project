"""
Interview Assistant Agent - Processes interview transcriptions and provides guidance
"""
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()


class InterviewAssistantAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="gpt-4",
            temperature=0.3,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.agent = Agent(
            role="Interview Analyst",
            goal="Analyze interview transcriptions, extract key insights, and provide candidate evaluation summaries",
            backstory="You are an expert at analyzing interviews. You can identify key responses, assess candidate fit, and extract structured information from conversations.",
            llm=self.llm,
            verbose=True
        )
    
    async def generate_guidance(self, candidate: dict, jd: dict = None, briefing: dict = None,
                               current_transcription: str = "", existing_interview: dict = None, role: dict = None) -> dict:
        """Generate real-time interview guidance"""
        # Determine what fields are missing
        collected_fields = {}
        if existing_interview and existing_interview.get('candidate_responses'):
            collected_fields = existing_interview['candidate_responses']
        
        # Use role's candidate_requirement_fields if available, otherwise use defaults
        if role and role.get('candidate_requirement_fields'):
            required_fields = role.get('candidate_requirement_fields', [])
        else:
            required_fields = ['expected_salary', 'earliest_start_date', 'work_authorization', 
                            'location_preferences', 'notice_period']
        
        missing_fields = [f.replace('_', ' ').title() if isinstance(f, str) else str(f) 
                         for f in required_fields 
                         if not collected_fields.get(f)]
        
        # Build context for guidance
        jd_text = ""
        if jd:
            jd_text = f"""
            Job Title: {jd.get('job_title', '')}
            Requirements: {', '.join(jd.get('requirements', []))}
            Skills: {', '.join(jd.get('skills', []))}
            """
        
        candidate_text = f"""
        Candidate: {candidate.get('name', 'Unknown')}
        Skills: {', '.join(candidate.get('skills', []))}
        Experience: {candidate.get('experience', 'N/A')}
        """
        
        task = Task(
            description=f"""
            You are providing real-time interview guidance for a recruiter conducting an interview.
            
            Job Description:
            {jd_text}
            
            Candidate Profile:
            {candidate_text}
            
            Current Interview Transcription (so far):
            {current_transcription[:1000] if current_transcription else "Interview just started"}
            
            Already Collected Information:
            {collected_fields}
            
            Missing Required Fields: {', '.join(missing_fields)}
            
            Generate interview guidance including:
            1. List of missing required fields that still need to be collected
            2. 3-5 suggested follow-up questions based on the job description and what's been discussed so far
            3. 2-3 behavioral probe questions to assess soft skills
            4. 2-3 technical probe questions based on the required skills
            5. 2-3 fitment analysis notes/suggestions based on what's been discussed
            
            Return a JSON object:
            {{
                "missing_fields": ["string"],
                "suggested_questions": ["string"],
                "behavioral_probes": ["string"],
                "technical_probes": ["string"],
                "fitment_notes": ["string"]
            }}
            """,
            agent=self.agent,
            expected_output="A JSON object with missing_fields, suggested_questions, behavioral_probes, technical_probes, and fitment_notes arrays"
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
                "missing_fields": missing_fields,
                "suggested_questions": [],
                "behavioral_probes": [],
                "technical_probes": [],
                "fitment_notes": []
            }
    
    async def process_interview(self, transcription: str, role_id: str, candidate_id: str, role: dict = None) -> dict:
        """Process interview transcription"""
        # Build candidate_responses structure based on role's requirement fields
        import json
        candidate_responses_structure = {}
        if role and role.get('candidate_requirement_fields'):
            for field in role.get('candidate_requirement_fields', []):
                candidate_responses_structure[field] = "string"
        else:
            # Default fields
            candidate_responses_structure = {
                "expected_salary": "string",
                "earliest_start_date": "string",
                "work_authorization": "string",
                "location_preferences": "string",
                "notice_period": "string"
            }
        
        fields_list = ', '.join(candidate_responses_structure.keys())
        
        task = Task(
            description=f"""
            Analyze the following interview transcription and extract structured insights:
            
            {transcription}
            
            Extract and return a JSON object with:
            {{
                "summary": "Brief summary of the interview",
                "key_points": ["string"],
                "candidate_responses": {{
                    {', '.join([f'"{k}": "string"' for k in candidate_responses_structure.keys()])}
                }},
                "strengths": ["string"],
                "concerns": ["string"],
                "fit_score": "number (0-100)",
                "recommendation": "yes|no|maybe"
            }}
            
            For candidate_responses, extract the values for these fields from the transcription:
            {fields_list}
            """,
            agent=self.agent,
            expected_output="A JSON object with summary, key_points, candidate_responses, strengths, concerns, fit_score (0-100), and recommendation (yes/no/maybe)"
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
                "key_points": [],
                "candidate_responses": {},
                "strengths": [],
                "concerns": [],
                "fit_score": 50,
                "recommendation": "maybe",
                "transcription": transcription
            }

