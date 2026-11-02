"""
PAYENT AGENT — KNOWLEDGE GUIDE IMPORTER MODULE SHIM
Provides top-level import compatibility for backend/import_knowledge_guide.py
delegating directly to backend/scripts/import_knowledge_guide.py.
"""

import os
import sys

SCRIPT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts", "import_knowledge_guide.py")

from scripts.import_knowledge_guide import (
    DEFAULT_DOCX_FILENAME,
    find_default_docx_path,
    generate_stable_id,
    import_knowledge_guide,
    parse_docx_knowledge_guide,
    print_summary,
)

__all__ = [
    "DEFAULT_DOCX_FILENAME",
    "find_default_docx_path",
    "generate_stable_id",
    "import_knowledge_guide",
    "parse_docx_knowledge_guide",
    "print_summary",
]

if __name__ == "__main__":
    from scripts.import_knowledge_guide import main
    main()
