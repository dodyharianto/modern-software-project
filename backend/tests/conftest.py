import sys
import os
from pathlib import Path

tests_dir = Path(__file__).resolve().parent
backend_dir = tests_dir.parent
project_dir = backend_dir.parent

sys.path.insert(0, str(project_dir))
sys.path.insert(0, str(backend_dir))
