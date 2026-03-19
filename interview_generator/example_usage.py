"""
Example usage of the Interview Generator
"""
from generate_interview import InterviewGenerator

def example_basic():
    """Basic example"""
    generator = InterviewGenerator()
    
    output_path = generator.generate_interview_audio(
        job_title="Software Engineer",
        job_description="Looking for a full-stack developer with React and Node.js experience",
        candidate_profile="Experienced developer with 4 years in web development"
    )
    
    print(f"Generated: {output_path}")

def example_from_role():
    """Example using role data from main app"""
    import json
    from pathlib import Path
    
    # Example: Load role data
    role_data = {
        "title": "Data Scientist",
        "jd": {
            "job_title": "Data Scientist",
            "job_summary": "We need a data scientist to build ML models",
            "requirements": ["Python", "Machine Learning", "3+ years"],
            "skills": ["Python", "TensorFlow", "SQL"]
        }
    }
    
    generator = InterviewGenerator()
    output_path = generator.generate_from_role_data(role_data)
    
    print(f"Generated: {output_path}")

if __name__ == "__main__":
    print("Example 1: Basic usage")
    example_basic()
    
    print("\nExample 2: From role data")
    example_from_role()

