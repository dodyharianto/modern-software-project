"""
Audio transcription service using OpenAI Whisper (local or API)
"""
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Try to import whisper, but handle any errors gracefully
WHISPER_AVAILABLE = False
whisper = None
try:
    import whisper
    WHISPER_AVAILABLE = True
except (ImportError, TypeError, Exception) as e:
    # Whisper failed to import - this is OK, we'll use OpenAI API as fallback
    WHISPER_AVAILABLE = False
    print(f"Warning: Local Whisper not available ({type(e).__name__}). Will use OpenAI Whisper API as fallback.")


class AudioTranscriptionService:
    def __init__(self):
        self.model = None
        self.model_name = "base"  # Use base model for faster processing
        self.whisper_available = WHISPER_AVAILABLE
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
    
    def _load_model(self):
        """Lazy load Whisper model"""
        if not self.whisper_available:
            raise Exception("Local Whisper is not installed. Using OpenAI API instead.")
        if self.model is None:
            try:
                self.model = whisper.load_model(self.model_name)
            except Exception as e:
                print(f"Error loading Whisper model: {e}. Falling back to OpenAI API.")
                self.whisper_available = False
                raise
        return self.model
    
    def _transcribe_with_openai(self, audio_path: Path) -> str:
        """Transcribe using OpenAI Whisper API"""
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.openai_api_key)
            
            with open(audio_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            return transcript
        except ImportError:
            raise Exception("OpenAI library not installed. Please install it with: pip install openai")
        except Exception as e:
            raise Exception(f"Error transcribing with OpenAI API: {str(e)}")
    
    def transcribe(self, audio_path: Path) -> str:
        """Transcribe audio file to text using local Whisper or OpenAI API"""
        try:
            if self.whisper_available:
                try:
                    model = self._load_model()
                    result = model.transcribe(str(audio_path))
                    return result["text"]
                except Exception as e:
                    print(f"Local Whisper failed: {e}. Falling back to OpenAI API.")
                    # Fall through to OpenAI API
            # Use OpenAI Whisper API as fallback
            if not self.openai_api_key:
                raise Exception("No OpenAI API key found. Please set OPENAI_API_KEY in .env file.")
            return self._transcribe_with_openai(audio_path)
        except Exception as e:
            raise Exception(f"Error transcribing audio: {str(e)}")
    
    async def transcribe_async(self, audio_path: Path) -> str:
        """Async wrapper for transcription"""
        # For now, just call sync version
        # In production, you might want to use a background task
        return self.transcribe(audio_path)

