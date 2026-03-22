"""
PDF Parser Service
==================
Extracts plain text from PDF files uploaded by users — primarily used for
parsing Job Descriptions (JDs) and candidate resumes before they are passed
to the CrewAI agent pipeline for structured analysis.

Consumed by:
    - JDParserAgent     (backend/agents/jd_parser.py)
    - CandidateParser   (backend/agents/candidate_parser.py)

Note: PyPDF2 works well for digitally-created PDFs. Scanned / image-based
PDFs will return empty or garbled text — an OCR library (e.g. pytesseract)
would be required for those cases.

Authors : Modern Software Solutions — IS631 Group Project
Version : 1.0.0
"""

import PyPDF2
from pathlib import Path


class PDFParserService:
    """
    Service for extracting plain text content from PDF files.

    Used as the first step in the document ingestion pipeline — the raw text
    returned by this service is passed directly to CrewAI agents for further
    parsing, structuring, and analysis.

    Typical usage:
        parser = PDFParserService()
        text = parser.extract_text(Path("resume.pdf"))
        page_count = parser.get_page_count(Path("resume.pdf"))
    """

    def extract_text(self, pdf_path: Path) -> str:
        """
        Read a PDF file and return its full text content as a single string.

        Each page's text is extracted in order and separated by a newline,
        preserving the natural reading flow of the document.

        Note: Only works reliably on digitally-created PDFs (not scanned images).
              If a page contains no selectable text, extract_text() returns an
              empty string for that page — no error is raised.

        Args:
            pdf_path (Path): Absolute or relative path to the PDF file.

        Returns:
            str: Full concatenated text content of all pages.
                 Returns an empty string if the PDF has no extractable text.

        Raises:
            Exception: Wraps any underlying IOError or PyPDF2 error with a
                       descriptive message for easier upstream debugging.
        """
        try:
            # Open in binary mode ("rb") — required by PyPDF2 for all platforms
            with open(pdf_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)

                text = ""
                # Iterate through every page and accumulate extracted text.
                # A newline is appended after each page to preserve separation.
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"

                return text

        except Exception as e:
            # Re-raise with context so callers know which file caused the issue
            raise Exception(f"Error parsing PDF '{pdf_path}': {str(e)}")

    def get_page_count(self, pdf_path: Path) -> int:
        """
        Return the total number of pages in a PDF without extracting all text.

        Useful as a lightweight pre-check before processing — e.g. to reject
        suspiciously large uploads or to log document size for auditing.

        Args:
            pdf_path (Path): Absolute or relative path to the PDF file.

        Returns:
            int: Total number of pages in the document.

        Raises:
            Exception: If the file cannot be opened or is not a valid PDF.

        Example:
            parser = PDFParserService()
            count = parser.get_page_count(Path("jd.pdf"))
            print(f"Document has {count} page(s).")
        """
        try:
            # Open in binary mode and read only the page count — no text extraction
            with open(pdf_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)
                return len(pdf_reader.pages)

        except Exception as e:
            raise Exception(f"Error reading page count from '{pdf_path}': {str(e)}")

