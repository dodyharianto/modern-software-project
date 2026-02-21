"""
Evaluation Agent - Provides intelligent candidate evaluation through chat interface
"""
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()


class EvaluationAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="gpt-4",
            temperature=0.4,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.agent = Agent(
            role="Candidate Evaluation Specialist",
            goal="Evaluate candidates comprehensively using job requirements, HR briefings, interviews, and comparison with other candidates",
            backstory="You are an expert recruiter with deep knowledge of candidate evaluation. You can analyze fit, compare candidates, and provide actionable insights based on multiple data sources.",
            llm=self.llm,
            verbose=True
        )
    
    async def evaluate(self, question: str, role: dict, candidate: dict, jd: dict = None, 
                      briefing: dict = None, interview: dict = None, other_candidates: list = None,
                      conversation_history: list = None) -> str:
        """Evaluate candidate based on question, with optional conversation history for context."""
        
        conversation_history = conversation_history or []
        context_parts = []
        
        if role:
            context_parts.append(f"Role: {role.get('title', '')}")
            # Add evaluation criteria if set
            if role.get('evaluation_criteria') and isinstance(role.get('evaluation_criteria'), list):
                context_parts.append(f"Evaluation Criteria: {', '.join(role.get('evaluation_criteria', []))}")
        
        if jd:
            context_parts.append(f"""
            Job Description:
            Title: {jd.get('job_title', '')}
            Summary: {jd.get('job_summary', '')}
            Requirements: {', '.join(jd.get('requirements', []))}
            Skills: {', '.join(jd.get('skills', []))}
            """)
        
        if briefing:
            context_parts.append(f"""
            HR Briefing:
            Summary: {briefing.get('summary', '')}
            Key Points: {briefing.get('extracted_fields', {})}
            """)
        
        if candidate:
            context_parts.append(f"""
            Candidate:
            Name: {candidate.get('name', '')}
            Summary: {candidate.get('summary', '')}
            Skills: {', '.join(candidate.get('skills', []))}
            Experience: {candidate.get('experience', '')}
            """)
        
        if interview:
            context_parts.append(f"""
            Interview:
            Summary: {interview.get('summary', '')}
            Key Points: {', '.join(interview.get('key_points', []))}
            Strengths: {', '.join(interview.get('strengths', []))}
            Concerns: {', '.join(interview.get('concerns', []))}
            Fit Score: {interview.get('fit_score', 'N/A')}
            """)
        
        # Build names summary for instructions (do this first)
        names_summary = ""
        candidate_names_list = []
        
        if other_candidates:
            candidates_details = []
            
            for idx, cand in enumerate(other_candidates, 1):
                # Extract name - try multiple fields
                candidate_name = cand.get('name', '') or cand.get('Name', '') or ''
                if not candidate_name or candidate_name.strip() == '':
                    candidate_name = f'Candidate {idx} (Name not extracted)'
                else:
                    candidate_names_list.append(candidate_name)
                
                # Get interview data if available
                interview_info = ""
                if cand.get('interview'):
                    interview = cand['interview']
                    interview_info = f"""
            - Interview Summary: {interview.get('summary', 'N/A')}
            - Interview Key Points: {', '.join(interview.get('key_points', [])) if interview.get('key_points') else 'N/A'}
            - Strengths: {', '.join(interview.get('strengths', [])) if interview.get('strengths') else 'N/A'}
            - Concerns: {', '.join(interview.get('concerns', [])) if interview.get('concerns') else 'N/A'}
            - Fit Score: {interview.get('fit_score', 'N/A')}/100
            - Recommendation: {interview.get('recommendation', 'N/A')}
            """
                
                # Format parsed insights
                insights = cand.get('parsed_insights', {})
                insights_text = ""
                if insights:
                    insights_parts = []
                    if insights.get('years_of_experience'):
                        insights_parts.append(f"Years of Experience: {insights.get('years_of_experience')}")
                    if insights.get('current_role'):
                        insights_parts.append(f"Current Role: {insights.get('current_role')}")
                    if insights.get('education'):
                        insights_parts.append(f"Education: {insights.get('education')}")
                    if insights.get('key_achievements'):
                        insights_parts.append(f"Key Achievements: {', '.join(insights.get('key_achievements', []))}")
                    if insights_parts:
                        insights_text = "\n            - " + "\n            - ".join(insights_parts)
                
                # Format skills properly
                skills_text = 'N/A'
                if cand.get('skills'):
                    if isinstance(cand['skills'], list):
                        skills_text = ', '.join(cand['skills']) if cand['skills'] else 'N/A'
                    else:
                        skills_text = str(cand['skills'])
                
                candidate_detail = f"""
            ===== CANDIDATE {idx}: {candidate_name} =====
            NAME: {candidate_name}
            Summary: {cand.get('summary', 'N/A')}
            Skills: {skills_text}
            Experience: {cand.get('experience', 'N/A')}{insights_text}
            Status: {cand.get('column', 'unknown')} ({cand.get('color', 'unknown')}){interview_info}
            ============================================
            """
                candidates_details.append(candidate_detail)
            
            # Build names summary
            if candidate_names_list:
                names_summary = f"Candidate Names: {', '.join(candidate_names_list)}"
            else:
                names_summary = "No candidate names available - names may need to be extracted from resumes"
            
            # Add candidate names list at the top for easy reference
            context_parts.append(f"""
            {names_summary}
            
            DETAILED CANDIDATE INFORMATION ({len(other_candidates)} candidates):
            {''.join(candidates_details)}
            
            Note: Candidates in "amber" state are in progress. Green indicates positive status, red indicates negative/no reply.
            """)
        
        # Build conversation context for follow-up questions
        conversation_context = ""
        if conversation_history:
            history_lines = []
            for msg in conversation_history[-10:]:  # Last 10 exchanges to avoid token limits
                role_label = msg.get("role", "user")
                content = msg.get("content", "")
                if content:
                    label = "User" if role_label == "user" else "Assistant"
                    history_lines.append(f"{label}: {content}")
            if history_lines:
                conversation_context = """
            PREVIOUS CONVERSATION (use this for context when answering follow-up questions):
            """ + "\n".join(history_lines) + """

            The user's new question may refer to or build on the conversation above. Answer with full context.
            """

        context = "\n\n".join(context_parts)
        
        # Debug: Print context to verify data is being passed
        print(f"\n{'='*60}")
        print(f"DEBUG Evaluation Agent - Question: {question}")
        print(f"DEBUG Evaluation Agent - Number of candidates: {len(other_candidates) if other_candidates else 0}")
        if other_candidates:
            for i, cand in enumerate(other_candidates, 1):
                name = cand.get('name', '') or cand.get('Name', '') or 'NO NAME'
                print(f"DEBUG Candidate {i}: Name='{name}', Skills={cand.get('skills', [])[:3] if cand.get('skills') else 'N/A'}")
        print(f"DEBUG Names Summary: {names_summary}")
        print(f"{'='*60}\n")
        
        task = Task(
            description=f"""
            You are evaluating candidates for a recruitment role. Answer the following question:
            {conversation_context}
            
            CURRENT QUESTION: {question}
            
            CONTEXT AND CANDIDATE DATA:
            {context}
            
            INSTRUCTIONS:
            1. You have detailed information about ALL candidates in the pipeline
            2. CRITICAL: Use the EXACT candidate NAMES provided above when referring to them
            3. The candidate names are: {names_summary}
            4. Reference SPECIFIC skills, experience, and qualifications from their profiles
            5. Compare candidates directly using the provided information
            6. If interview data is available, include fit scores and recommendations
            7. Be specific and detailed in your analysis
            8. ALWAYS use candidate names in your response - never say "candidate 1" or "the first candidate"
            
            EXAMPLE: If a candidate is named "John Smith", say "John Smith has 5 years of Python experience" 
            NOT "Candidate 1 has 5 years of experience" or "The first candidate..."
            
            IMPORTANT: The candidate data above includes their NAMES (listed at the top), summaries, skills, experience, and parsed insights. 
            You MUST use the actual candidate names when answering questions. If names are not available, mention that names need to be extracted from the resumes.
            """,
            agent=self.agent,
            expected_output="A detailed, specific answer that references actual candidate names, skills, and qualifications from the provided data"
        )
        
        result = task.execute()
        return result.strip()

