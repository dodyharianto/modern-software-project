"""
Quick script to set up .env file for interview generator
"""
import os
from pathlib import Path

def setup_env():
    """Create .env file or copy from backend"""
    current_dir = Path(__file__).parent
    backend_env = current_dir.parent / "backend" / ".env"
    local_env = current_dir / ".env"
    
    if local_env.exists():
        print(f".env file already exists at: {local_env}")
        return
    
    if backend_env.exists():
        print("Copying .env from backend...")
        with open(backend_env, 'r', encoding='utf-8') as src:
            content = src.read()
        with open(local_env, 'w', encoding='utf-8') as dst:
            dst.write(content)
        print(f"Created .env file at: {local_env}")
    else:
        print("No .env file found. Creating template...")
        api_key = input("Enter your OpenAI API key (or press Enter to skip): ").strip()
        
        if api_key:
            with open(local_env, 'w', encoding='utf-8') as f:
                f.write(f"OPENAI_API_KEY={api_key}\n")
            print(f"Created .env file at: {local_env}")
        else:
            print("No API key provided. Please create .env manually or set OPENAI_API_KEY environment variable.")

if __name__ == "__main__":
    setup_env()

