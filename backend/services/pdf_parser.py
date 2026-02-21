"""
PDF parsing service for extracting text from PDF files
"""
import PyPDF2
from pathlib import Path
from typing import Optional


class PDFParserService:
    def extract_text(self, pdf_path: Path) -> str:
        """Extract text from PDF file"""
        try:
            with open(pdf_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except Exception as e:
            raise Exception(f"Error parsing PDF: {str(e)}")

