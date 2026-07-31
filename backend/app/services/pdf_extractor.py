import re
import hashlib
import logging
from pathlib import Path
from typing import Optional, Tuple
import pdfplumber
from pdfminer.pdfdocument import PDFPasswordIncorrect, PDFEncryptionError

from backend.app.core.config import BACKEND_DIR

logger = logging.getLogger("regpulse.pdf_extractor")

# Define paths using pathlib
DATA_DIR = BACKEND_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
CACHE_DIR = DATA_DIR / "cache"
SAMPLES_DIR = DATA_DIR / "sample_circulars"

# Ensure directories exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

def compute_sha256(file_path: Path) -> str:
    """Computes the SHA-256 hash of a file using pathlib and reading in chunks."""
    sha256_hash = hashlib.sha256()
    with file_path.open("rb") as f:
        # Read in 64KB chunks
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extracts raw text page-by-page from a PDF file using pdfplumber.
    Ignores empty pages and handles encrypted PDFs gracefully.
    """
    logger.info("Extraction started for file: %s", pdf_path.name)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file does not exist: {pdf_path}")
        
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Check for encryption
            if getattr(pdf, "doc", None) and getattr(pdf.doc, "is_encrypted", False):
                raise ValueError("PDF is encrypted/password-protected.")
            
            pages_text = []
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text and text.strip():
                    pages_text.append(text)
            
            if not pages_text:
                raise ValueError("PDF is empty or unreadable.")
            
            logger.info("Extraction completed for file: %s (%d pages)", pdf_path.name, len(pages_text))
            return "\n\n".join(pages_text)
            
    except (PDFPasswordIncorrect, PDFEncryptionError):
        logger.error("Failed to extract text: PDF is encrypted.")
        raise ValueError("PDF is encrypted and password-protected.")
    except ValueError as ve:
        logger.error("Failed to extract text: %s", str(ve))
        raise ve
    except Exception as e:
        logger.error("Error during text extraction: %s", str(e))
        raise ValueError(f"Failed to read PDF: {str(e)}")

def clean_rbi_text(text: str) -> str:
    """Cleans raw text by removing repeated RBI headers, footers, page numbers,
    and extra formatting noise while preserving paragraphs and headings.
    """
    if not text:
        return ""
    
    # Split into lines
    lines = text.splitlines()
    cleaned_lines = []
    
    # Define exact-match or substring patterns for header/footer removal (case-insensitive)
    remove_patterns = [
        # RBI Names
        r"^reserve\s+bank\s+of\s+india\.?$",
        r"^भारतीय\s+रिज़र्व\s+बैंक\.?$",
        r"^www\.rbi\.org\.in$",
        
        # Departments
        r"^department\s+of\s+regulation\.?$",
        r"^department\s+of\s+banking\s+regulation\.?$",
        r"^department\s+of\s+banking\s+supervision\.?$",
        r"^department\s+of\s+non-banking\s+regulation\.?$",
        r"^co-operative\s+bank\s+regulation\s+department\.?$",
        r"^financial\s+markets\s+regulation\s+department\.?$",
        r"^foreign\s+exchange\s+department\.?$",
        r"^department\s+of\s+supervision\.?$",
        
        # Address & Contact
        r"^central\s+office\s+building.*$",
        r"^central\s+office.*$",
        r"^shahid\s+bhagat\s+singh\s+marg.*$",
        r"^mumbai\s*-\s*400\s*001\.?$",
        
        # Contact details lines
        r"^tel(?:ephone)?\s*:\s*[\d\s-]+.*$",
        r"^fax\s*:\s*[\d\s-]+.*$",
        r"^e-mail\s*:\s*[\w\.-]+@[\w\.-]+.*$",
        
        # Page numbers
        r"^page\s*\d+\s*(?:of|/|-)?\s*\d*$",
        r"^\s*\d+\s*$",
    ]
    
    compiled_patterns = [re.compile(p, re.IGNORECASE) for p in remove_patterns]
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append("")
            continue
            
        should_remove = False
        for pattern in compiled_patterns:
            if pattern.match(stripped):
                should_remove = True
                break
                
        if not should_remove:
            # Remove multiple internal spaces/tabs
            cleaned_line = re.sub(r'[ \t]+', ' ', stripped)
            cleaned_lines.append(cleaned_line)
            
    # Reconstruct text
    cleaned_text = "\n".join(cleaned_lines)
    # Replace 3 or more consecutive newlines with exactly 2 to preserve paragraph breaks cleanly
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
    return cleaned_text.strip()

def get_or_extract_text(pdf_path: Path, pdf_hash: str) -> Tuple[str, bool]:
    """Gets cleaned text from cache if available, otherwise extracts and caches it.
    Returns a tuple of (cleaned_text, cached_hit).
    """
    cache_path = CACHE_DIR / f"{pdf_hash}.txt"
    
    if cache_path.exists():
        logger.info("Cache hit for: %s (hash: %s)", pdf_path.name, pdf_hash)
        with cache_path.open("r", encoding="utf-8") as f:
            return f.read(), True
            
    logger.info("Cache miss. Extraction started for: %s (hash: %s)", pdf_path.name, pdf_hash)
    raw_text = extract_text_from_pdf(pdf_path)
    cleaned_text = clean_rbi_text(raw_text)
    
    # Save cleaned text to cache
    with cache_path.open("w", encoding="utf-8") as f:
        f.write(cleaned_text)
    logger.info("Saved text to cache for hash: %s", pdf_hash)
    
    return cleaned_text, False

def extract_version_date(text: str) -> Optional[str]:
    """Extracts a version date from the text in common formats."""
    sample = text[:2000]
    
    # 1. Month DD, YYYY
    pattern1 = r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),\s+(\d{4})\b'
    match1 = re.search(pattern1, sample, re.IGNORECASE)
    if match1:
        return f"{match1.group(1)} {match1.group(2)}, {match1.group(3)}"
        
    # 2. DD Month YYYY
    pattern2 = r'\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b'
    match2 = re.search(pattern2, sample, re.IGNORECASE)
    if match2:
        return f"{match2.group(1)} {match2.group(2)} {match2.group(3)}"
        
    # 3. DD-MM-YYYY or DD/MM/YYYY
    pattern3 = r'\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b'
    match3 = re.search(pattern3, sample)
    if match3:
        return f"{match3.group(1)}-{match3.group(2)}-{match3.group(3)}"
        
    return None

def extract_title(cleaned_text: str, filename: str) -> str:
    """Extracts the title as the first line of cleaned text, or falls back to filename stem."""
    lines = [line.strip() for line in cleaned_text.splitlines() if line.strip()]
    if lines:
        first_line = lines[0]
        # Allow titles up to 200 characters
        if 5 <= len(first_line) <= 200:
            return first_line
            
    stem = Path(filename).stem
    return re.sub(r'[-_]+', ' ', stem).strip()
