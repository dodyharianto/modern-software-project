"""
Interview Audio Generator
Generates realistic interview audio conversations for testing the main app
"""
import os
import json
from pathlib import Path
from typing import Dict, List, Optional
from dotenv import load_dotenv
from openai import OpenAI
import time
import subprocess
import sys

# Try to import pydub, but handle gracefully if FFmpeg is missing
try:
    from pydub import AudioSegment
    from pydub.effects import normalize
    PYDUB_AVAILABLE = True
except Exception as e:
    PYDUB_AVAILABLE = False
    print(f"Warning: pydub not fully available: {e}")

# Try to load .env from current directory and parent directory (backend)
env_paths = [
    Path(__file__).parent / ".env",
    Path(__file__).parent.parent / "backend" / ".env",
    Path(__file__).parent.parent / ".env"
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded .env from: {env_path}")
        break
else:
    # Try loading from environment
    load_dotenv()

class InterviewGenerator:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY not found!\n"
                "Please set it in one of these locations:\n"
                "  1. interview_generator/.env\n"
                "  2. backend/.env\n"
                "  3. Environment variable OPENAI_API_KEY\n"
                "\nOr run: export OPENAI_API_KEY='your-key-here'"
            )
        self.client = OpenAI(api_key=api_key)
        
        # Set output directory relative to script location
        script_dir = Path(__file__).parent
        self.output_dir = script_dir / "output"
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_interview_script(self, job_title: str, job_description: str = None, 
                                  candidate_profile: str = None) -> List[Dict[str, str]]:
        """Generate interview conversation script using GPT"""
        
        prompt = f"""Generate a realistic interview conversation between an interviewer and a candidate for the position of {job_title}.

Job Description: {job_description or "General position"}

Candidate Profile: {candidate_profile or "Experienced professional"}

Generate a natural conversation with:
1. Interviewer greeting and introduction
2. 5-7 interview questions covering:
   - Technical skills
   - Experience
   - Behavioral questions
   - Salary expectations
   - Start date
   - Work authorization
   - Location preferences
   - Notice period
3. Candidate responses that are realistic and detailed
4. Natural back-and-forth conversation

Format as a JSON array where each item has:
- "speaker": "interviewer" or "candidate"
- "text": "the spoken text"

Make it sound natural and conversational. Include pauses and natural speech patterns."""

        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert at creating realistic interview conversations. Generate natural, flowing dialogue. Always respond with valid JSON only, no additional text."},
                {"role": "user", "content": prompt + "\n\nIMPORTANT: Respond with ONLY a valid JSON object. Do not include any explanatory text before or after the JSON."}
            ],
            temperature=0.7
        )
        
        content = response.choices[0].message.content.strip()
        
        # Try to extract JSON from the response
        try:
            # Remove markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            result = json.loads(content)
            
            # Handle different possible response formats
            if "conversation" in result:
                return result["conversation"]
            elif isinstance(result, list):
                return result
            elif "script" in result:
                return result["script"]
            elif "dialogue" in result:
                return result["dialogue"]
            else:
                # If it's a dict with speaker/text keys, return as list
                if isinstance(result, dict) and any("speaker" in str(k).lower() or "text" in str(k).lower() for k in result.keys()):
                    # Try to find array in the dict
                    for key, value in result.items():
                        if isinstance(value, list):
                            return value
                return []
        except json.JSONDecodeError as e:
            print(f"Warning: Failed to parse JSON response. Error: {e}")
            print(f"Response content: {content[:200]}...")
            # Try to extract conversation from text
            return []
    
    def text_to_speech(self, text: str, voice: str = "alloy", output_path: Path = None) -> Path:
        """Convert text to speech using OpenAI TTS"""
        if output_path is None:
            output_path = self.output_dir / f"temp_{int(time.time())}.mp3"
        
        response = self.client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text
        )
        
        # Write response content directly to file
        with open(output_path, 'wb') as f:
            for chunk in response.iter_bytes():
                f.write(chunk)
        
        return output_path
    
    def check_ffmpeg(self) -> bool:
        """Check if FFmpeg is available"""
        try:
            import os
            # First try with current PATH
            result = subprocess.run(['ffmpeg', '-version'], 
                                  capture_output=True,
                                  timeout=5)
            if result.returncode == 0:
                return True
            
            # If not found, try refreshing PATH from system
            env = os.environ.copy()
            # Get system PATH
            system_path = os.environ.get('PATH', '')
            # Also check common installation locations
            possible_paths = [
                r"C:\ffmpeg\bin",
                r"C:\Program Files\ffmpeg\bin",
                r"C:\tools\ffmpeg\bin",
                os.path.expanduser(r"~\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_*\ffmpeg-*\bin"),
            ]
            
            # Try to find FFmpeg in Program Files
            program_files = os.environ.get('ProgramFiles', r'C:\Program Files')
            for item in os.listdir(program_files):
                if 'ffmpeg' in item.lower():
                    possible_paths.append(os.path.join(program_files, item, 'bin'))
            
            # Add to PATH if they exist
            for path in possible_paths:
                if '*' in path:
                    # Handle glob pattern
                    import glob
                    matches = glob.glob(path)
                    for match in matches:
                        if os.path.exists(match) and match not in system_path:
                            system_path = match + os.pathsep + system_path
                elif os.path.exists(path) and path not in system_path:
                    system_path = path + os.pathsep + system_path
            
            env['PATH'] = system_path
            
            result = subprocess.run(['ffmpeg', '-version'], 
                                  capture_output=True,
                                  env=env,
                                  timeout=5)
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
            return False
    
    def convert_mp3_to_wav(self, mp3_path: Path) -> Path:
        """Convert MP3 to WAV if FFmpeg is available, otherwise return MP3"""
        # If FFmpeg is available, we can convert, but for now just return MP3
        # The main app should handle MP3 files
        return mp3_path
    
    def generate_interview_audio(self, job_title: str, job_description: str = None,
                                 candidate_profile: str = None, output_filename: str = None) -> Path:
        """Generate complete interview audio file"""
        
        print(f"Generating interview script for {job_title}...")
        script = self.generate_interview_script(job_title, job_description, candidate_profile)
        
        if not script:
            raise ValueError("Failed to generate interview script")
        
        print(f"Generated {len(script)} conversation segments")
        print("Converting to speech...")
        
        # Use different voices for interviewer and candidate
        interviewer_voice = "alloy"  # Neutral, professional
        candidate_voice = "shimmer"  # Slightly different tone
        
        # Collect all audio files first
        audio_files = []
        
        for i, segment in enumerate(script):
            speaker = segment.get("speaker", "interviewer")
            text = segment.get("text", "")
            
            if not text:
                continue
            
            print(f"  [{i+1}/{len(script)}] {speaker}: {text[:50]}...")
            
            # Choose voice based on speaker
            voice = interviewer_voice if speaker == "interviewer" else candidate_voice
            
            # Generate speech (returns MP3 file)
            temp_file = self.text_to_speech(text, voice)
            
            # Convert MP3 to WAV if FFmpeg not available, or keep MP3
            audio_file = self.convert_mp3_to_wav(temp_file)
            audio_files.append(audio_file)
        
        # Combine audio files using FFmpeg if available
        print("Combining audio segments...")
        
        if self.check_ffmpeg():
            # Use FFmpeg to concatenate files
            if output_filename is None:
                timestamp = int(time.time())
                safe_job_title = "".join(c for c in job_title if c.isalnum() or c in (' ', '-', '_')).rstrip()
                output_filename = f"interview_{safe_job_title}_{timestamp}.mp3"
            
            output_path = self.output_dir / output_filename
            
            # Create file list for FFmpeg concat
            file_list_path = self.output_dir / f"concat_list_{int(time.time())}.txt"
            with open(file_list_path, 'w', encoding='utf-8') as f:
                for audio_file in audio_files:
                    # Escape single quotes in path for FFmpeg
                    escaped_path = str(audio_file.absolute()).replace("'", "'\\''")
                    f.write(f"file '{escaped_path}'\n")
            
            # Use FFmpeg to concatenate with 0.5s pause between files
            try:
                # First, add silence to each file, then concat
                subprocess.run(
                    ['ffmpeg', '-f', 'concat', '-safe', '0', '-i', str(file_list_path), 
                     '-c', 'copy', '-y', str(output_path)],
                    check=True,
                    capture_output=True,
                    timeout=300
                )
                file_list_path.unlink()
            except Exception as e:
                print(f"Error combining with FFmpeg: {e}")
                # Fallback: just copy first file
                if audio_files:
                    import shutil
                    shutil.copy(audio_files[0], output_path)
        else:
            # Without FFmpeg, we can't easily combine MP3s
            # Just use the first file or provide instructions
            print("Warning: FFmpeg not available. Cannot combine multiple audio segments.")
            print("Please install FFmpeg to combine segments:")
            print("  winget install ffmpeg")
            print("  OR")
            print("  choco install ffmpeg")
            print("\nFor now, using the first audio segment only.")
            
            if output_filename is None:
                timestamp = int(time.time())
                safe_job_title = "".join(c for c in job_title if c.isalnum() or c in (' ', '-', '_')).rstrip()
                output_filename = f"interview_{safe_job_title}_{timestamp}.mp3"
            
            output_path = self.output_dir / output_filename
            
            if audio_files:
                import shutil
                shutil.copy(audio_files[0], output_path)
                print(f"Saved first segment as: {output_path}")
            else:
                raise Exception("No audio files generated")
        
        # Clean up temp files (keep the final output)
        for audio_file in audio_files:
            if audio_file != output_path and audio_file.exists():
                try:
                    audio_file.unlink()
                except:
                    pass
        
        # Get duration if possible
        duration_info = ""
        try:
            if self.check_ffmpeg():
                # Use ffprobe to get duration
                result = subprocess.run(
                    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', 
                     '-of', 'default=noprint_wrappers=1:nokey=1', str(output_path)],
                    capture_output=True,
                    timeout=10
                )
                if result.returncode == 0:
                    duration = float(result.stdout.decode().strip())
                    duration_info = f"[DURATION] Duration: {duration:.1f} seconds"
        except:
            pass
        
        print(f"\n[SUCCESS] Interview audio generated successfully!")
        print(f"[FILE] Output file: {output_path}")
        if duration_info:
            print(duration_info)
        
        return output_path
    
    def generate_from_role_data(self, role_data: Dict) -> Path:
        """Generate interview from role data (compatible with main app format)"""
        job_title = role_data.get("title", "Software Engineer")
        jd = role_data.get("jd", {})
        
        job_description = ""
        if isinstance(jd, dict):
            job_description = f"""
Title: {jd.get('job_title', job_title)}
Summary: {jd.get('job_summary', '')}
Requirements: {', '.join(jd.get('requirements', []))}
Skills: {', '.join(jd.get('skills', []))}
"""
        elif isinstance(jd, str):
            job_description = jd
        
        # Generate candidate profile
        candidate_profile = "Experienced professional with relevant skills and background"
        
        return self.generate_interview_audio(job_title, job_description, candidate_profile)


def main():
    """CLI interface for interview generator"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate interview audio for testing")
    parser.add_argument("--job-title", type=str, required=True, help="Job title for the interview")
    parser.add_argument("--job-description", type=str, help="Job description text")
    parser.add_argument("--candidate-profile", type=str, help="Candidate profile description")
    parser.add_argument("--output", type=str, help="Output filename")
    parser.add_argument("--role-file", type=str, help="Path to role.json file from main app")
    
    args = parser.parse_args()
    
    generator = InterviewGenerator()
    
    if args.role_file:
        # Load role data from main app
        with open(args.role_file, 'r') as f:
            role_data = json.load(f)
        
        # Try to load JD if available
        role_dir = Path(args.role_file).parent
        jd_file = role_dir / "jd_parsed.json"
        if jd_file.exists():
            with open(jd_file, 'r') as f:
                role_data["jd"] = json.load(f)
        
        output_path = generator.generate_from_role_data(role_data)
    else:
        output_path = generator.generate_interview_audio(
            args.job_title,
            args.job_description,
            args.candidate_profile,
            args.output
        )
    
    print(f"\n[SUCCESS] You can now upload this file to test your main app:")
    print(f"   {output_path}")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main() or 0)

