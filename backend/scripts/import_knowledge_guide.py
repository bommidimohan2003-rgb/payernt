#!/usr/bin/env python3
"""
PAYENT AGENT — DOCX KNOWLEDGE GUIDE INGESTION SCRIPT
Parses PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx into structured entries.
Idempotent, safe, supports dry-run preview, and strictly sets imported entries
to 'pending_review' and 'is_verified=False' awaiting explicit admin review.
"""

import argparse
import hashlib
import json
import logging
import os
import re
import sys
from typing import Any, Dict, List, Optional, Tuple

# Ensure backend root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import docx
from agent_engine.retrieval.knowledge_manager import KnowledgeManager, init_knowledge_tables

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("payent.agent.import_knowledge")

DEFAULT_DOCX_FILENAME = "PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx"


def find_default_docx_path() -> str:
    """Finds the default DOCX knowledge guide in the project hierarchy."""
    candidates = [
        os.path.join(BACKEND_DIR, "..", DEFAULT_DOCX_FILENAME),
        os.path.join(BACKEND_DIR, DEFAULT_DOCX_FILENAME),
        os.path.join(os.getcwd(), DEFAULT_DOCX_FILENAME),
        os.path.join(os.getcwd(), "payernt-main", DEFAULT_DOCX_FILENAME),
        r"C:\payernt-main\payernt-main\PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx",
    ]
    for c in candidates:
        abs_c = os.path.abspath(c)
        if os.path.exists(abs_c):
            return abs_c
    return os.path.abspath(candidates[0])


def parse_docx_knowledge_guide(file_path: str) -> List[Dict[str, Any]]:
    """
    Parses the DOCX knowledge guide document into structured dictionaries.
    Extracts categories, questions, answers, synonyms, retrieval types, and verification notes.
    Preserves Unicode Telugu-English characters.
    Handles multiline answers.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Knowledge guide DOCX not found at path: {file_path}")

    doc = docx.Document(file_path)
    entries: List[Dict[str, Any]] = []

    current_category: Optional[str] = None
    current_entry: Optional[Dict[str, Any]] = None

    for i, p in enumerate(doc.paragraphs):
        text = p.text.strip()
        if not text:
            continue

        style_name = p.style.name if p.style else ""

        # 1. Section Header Detection (Heading 1)
        if style_name.startswith("Heading 1"):
            # Check for numbered categories (sections 2 to 14)
            match = re.match(r"^(\d+)\.\s*(.+)$", text)
            if match:
                sec_num = int(match.group(1))
                sec_title = match.group(2).strip()
                if 2 <= sec_num <= 14:
                    current_category = sec_title
                else:
                    # Sections 1 (purpose) and 15+ (rules, checklists)
                    current_category = None
            continue

        # 2. Question Detection
        if text.startswith("Q:") or style_name.startswith("Heading 2"):
            if current_entry:
                entries.append(current_entry)
                current_entry = None

            q_clean = re.sub(r"^Q:\s*", "", text).strip()
            current_entry = {
                "category": current_category or "General information",
                "canonical_question": q_clean,
                "answer_markdown": "",
                "synonyms": [],
                "retrieval_type": "guide",
                "raw_retrieval": "",
                "is_verified": False,
                "has_verify_marker": False,
                "verification_notes": None,
                "paragraph_index": i,
            }
            continue

        # 3. Field Parsing within Active Question
        if current_entry is not None:
            if text.startswith("Answer:"):
                ans_body = re.sub(r"^Answer:\s*", "", text).strip()
                current_entry["answer_markdown"] = ans_body
                if "[VERIFY" in ans_body.upper():
                    current_entry["has_verify_marker"] = True
                    vm = re.search(r"\[VERIFY[^\]]*\]", ans_body, re.IGNORECASE)
                    if vm:
                        current_entry["verification_notes"] = vm.group(0).strip()
            elif text.startswith("Alternative phrasings:"):
                syn_str = re.sub(r"^Alternative phrasings:\s*", "", text).strip()
                # Split by semicolon
                phrases = [s.strip() for s in syn_str.split(";") if s.strip()]
                current_entry["synonyms"] = phrases
            elif text.startswith("Retrieval:"):
                ret_str = re.sub(r"^Retrieval:\s*", "", text).strip()
                current_entry["raw_retrieval"] = ret_str
                ret_lower = ret_str.lower()
                if "hybrid" in ret_lower:
                    current_entry["retrieval_type"] = "hybrid"
                elif "live db" in ret_lower or "live_db" in ret_lower or "live database" in ret_lower:
                    current_entry["retrieval_type"] = "live_db"
                else:
                    current_entry["retrieval_type"] = "guide"
            else:
                # Continuation / multiline paragraph for answer
                if current_entry["answer_markdown"] and not current_entry["synonyms"] and not current_entry["raw_retrieval"]:
                    current_entry["answer_markdown"] += "\n" + text
                    if "[VERIFY" in text.upper():
                        current_entry["has_verify_marker"] = True
                        vm = re.search(r"\[VERIFY[^\]]*\]", text, re.IGNORECASE)
                        if vm and not current_entry["verification_notes"]:
                            current_entry["verification_notes"] = vm.group(0).strip()

    if current_entry:
        entries.append(current_entry)

    # Validate extracted entries
    for idx, e in enumerate(entries):
        if not e["canonical_question"]:
            raise ValueError(f"Entry at index {idx} has empty canonical question.")
        if not e["answer_markdown"]:
            raise ValueError(f"Entry '{e['canonical_question']}' has empty answer markdown.")
        if not e["category"]:
            raise ValueError(f"Entry '{e['canonical_question']}' has missing category.")

    return entries


def generate_stable_id(entry: Dict[str, Any], index: int) -> str:
    """Generates a deterministic knowledge ID for idempotent imports."""
    content_key = f"{entry['category']}:{entry['canonical_question']}".strip().lower()
    h = hashlib.md5(content_key.encode("utf-8")).hexdigest()[:8].upper()
    return f"KB-DOCX-{index+1:03d}-{h}"


def import_knowledge_guide(
    file_path: Optional[str] = None,
    dry_run: bool = False,
    km: Optional[KnowledgeManager] = None,
) -> Dict[str, Any]:
    """
    Executes the ingestion pipeline.
    Parses DOCX, validates entries, and inserts or previews records.
    Guarantees idempotency and safety.
    """
    actual_path = file_path or find_default_docx_path()
    logger.info(f"Initiating knowledge guide import from: {actual_path}")

    entries = parse_docx_knowledge_guide(actual_path)
    manager = km or KnowledgeManager()

    # Pre-calculate category & retrieval statistics
    categories = sorted(list(set(e["category"] for e in entries)))
    guide_count = sum(1 for e in entries if e["retrieval_type"] == "guide")
    hybrid_count = sum(1 for e in entries if e["retrieval_type"] == "hybrid")
    livedb_count = sum(1 for e in entries if e["retrieval_type"] == "live_db")
    verify_count = sum(1 for e in entries if e["has_verify_marker"])

    stats: Dict[str, Any] = {
        "source_file": actual_path,
        "dry_run": dry_run,
        "total_parsed": len(entries),
        "total_categories": len(categories),
        "categories": categories,
        "retrieval_breakdown": {
            "guide": guide_count,
            "hybrid": hybrid_count,
            "live_db": livedb_count,
        },
        "verify_marker_count": verify_count,
        "inserted": 0,
        "skipped_existing": 0,
        "entries": [],
    }

    # Fetch existing entries to guarantee idempotency
    existing_entries = manager.list_entries()
    existing_by_q = {e["canonical_question"].strip().lower(): e for e in existing_entries}
    existing_by_id = {e["id"]: e for e in existing_entries}

    for idx, e in enumerate(entries):
        stable_id = generate_stable_id(e, idx)
        norm_q = e["canonical_question"].strip().lower()

        existing = existing_by_id.get(stable_id) or existing_by_q.get(norm_q)

        if existing:
            # Entry already exists: do not overwrite admin changes or published state!
            stats["skipped_existing"] += 1
            stats["entries"].append({
                "id": existing["id"],
                "question": e["canonical_question"],
                "category": e["category"],
                "retrieval_type": e["retrieval_type"],
                "action": "skipped_existing",
                "status": existing["status"],
            })
            continue

        # New entry to insert
        entry_meta = {
            "id": stable_id,
            "question": e["canonical_question"],
            "category": e["category"],
            "retrieval_type": e["retrieval_type"],
            "action": "would_insert" if dry_run else "inserted",
            "status": "pending_review",
            "is_verified": False,
            "verification_notes": e["verification_notes"],
        }
        stats["entries"].append(entry_meta)

        if not dry_run:
            manager.create_entry(
                category=e["category"],
                canonical_question=e["canonical_question"],
                answer_markdown=e["answer_markdown"],
                retrieval_type=e["retrieval_type"],
                status="pending_review",
                is_verified=False,
                verification_notes=e["verification_notes"],
                source_document=os.path.basename(actual_path),
                synonyms=e["synonyms"],
                approved_by=None,
                custom_id=stable_id,
            )
            stats["inserted"] += 1
        else:
            stats["inserted"] += 1

    return stats


def print_summary(stats: Dict[str, Any]) -> None:
    """Pretty prints the import outcome summary."""
    print("\n" + "=" * 70)
    print(f"PAYENT AGENT — KNOWLEDGE GUIDE INGESTION REPORT {'(DRY RUN)' if stats['dry_run'] else ''}")
    print("=" * 70)
    print(f"Source Document       : {stats['source_file']}")
    print(f"Total Parsed Entries  : {stats['total_parsed']}")
    print(f"Total Categories      : {stats['total_categories']}")
    print(f"Retrieval Breakdown   : GUIDE: {stats['retrieval_breakdown']['guide']} | HYBRID: {stats['retrieval_breakdown']['hybrid']} | LIVE_DB: {stats['retrieval_breakdown']['live_db']}")
    print(f"Verify Markers Found  : {stats['verify_marker_count']}")
    print(f"New Records Actioned  : {stats['inserted']}")
    print(f"Skipped Existing      : {stats['skipped_existing']}")
    print("-" * 70)
    print("Categories Found:")
    for cat in stats["categories"]:
        print(f"  • {cat}")
    print("=" * 70 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Ingest PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx into Payent Agent Knowledge DB.")
    parser.add_argument("--file", "-f", type=str, default=None, help="Path to PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx")
    parser.add_argument("--dry-run", "-d", action="store_true", help="Parse and preview without database modifications.")
    args = parser.parse_args()

    try:
        stats = import_knowledge_guide(file_path=args.file, dry_run=args.dry_run)
        print_summary(stats)
    except Exception as e:
        logger.error(f"Import failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
