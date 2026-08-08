import io
import re
import zipfile
import xml.etree.ElementTree as ET
from pypdf import PdfReader
import docx

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extract raw text from .txt, .pdf, or .docx file bytes."""
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.txt'):
        try:
            return file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            return file_bytes.decode('latin-1', errors='ignore')
            
    elif filename_lower.endswith('.pdf'):
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        extracted = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted.append(text)
        return "\n".join(extracted)
        
    elif filename_lower.endswith('.docx'):
        # Try python-docx first
        try:
            docx_file = io.BytesIO(file_bytes)
            doc = docx.Document(docx_file)
            return "\n".join([p.text for p in doc.paragraphs if p.text])
        except Exception:
            # Fallback to direct xml parsing inside zip
            try:
                z = zipfile.ZipFile(io.BytesIO(file_bytes))
                xml_content = z.read('word/document.xml')
                tree = ET.fromstring(xml_content)
                ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
                paragraphs = []
                for p in tree.iter(f'{ns}p'):
                    p_text = ''.join(node.text for node in p.iter(f'{ns}t') if node.text)
                    if p_text.strip():
                        paragraphs.append(p_text.strip())
                return "\n".join(paragraphs)
            except Exception as e:
                raise ValueError(f"Could not parse docx file: {str(e)}")
    else:
        raise ValueError(f"Unsupported file format for {filename}. Accepted: .txt, .pdf, .docx")

def extract_reference_style(file_bytes: bytes, filename: str) -> dict:
    """Extract layout, section ordering, formatting hints, and color tones from reference resume."""
    text = extract_text_from_file(file_bytes, filename)
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Identify heading structure and section ordering
    common_headings = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'achievements', 'relevant skills']
    section_order = []
    
    for line in lines:
        clean = line.lower().strip(': ')
        for h in common_headings:
            if h in clean and len(line) < 40:
                if h.capitalize() not in section_order:
                    section_order.append(h.capitalize())
    
    if not section_order:
        section_order = ['Summary', 'Skills', 'Experience', 'Projects', 'Education']
        
    # Tone and layout parameters
    primary_color = "#1E293B"  # Professional slate default
    accent_color = "#2563EB"   # Elegant blue default
    
    if "teal" in text.lower() or "cyan" in text.lower():
        accent_color = "#0D9488"
    elif "purple" in text.lower() or "violet" in text.lower():
        accent_color = "#7C3AED"
    elif "green" in text.lower() or "emerald" in text.lower():
        accent_color = "#059669"
        
    return {
        "filename": filename,
        "section_order": section_order,
        "font_family": "Helvetica",
        "primary_color": primary_color,
        "accent_color": accent_color,
        "line_spacing": 1.2,
        "header_alignment": "left" if len(lines) > 0 and len(lines[0]) < 30 else "center"
    }
