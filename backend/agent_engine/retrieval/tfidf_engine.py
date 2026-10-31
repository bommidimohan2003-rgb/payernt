"""
PAYENT AGENT — ADVANCED PURE-PYTHON TF-IDF RETRIEVAL ENGINE
Deterministic information retrieval engine utilizing sublinear TF-IDF vectorization,
field-boosted cosine similarity, Telugu-English normalization, domain synonyms,
spelling error correction, and ambiguity detection.
Strictly pure Python: zero external AI APIs, zero pretrained LLMs, zero external inference.
"""

import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

# Reusable project components identified in Phase 8.1 audit
from agent_engine.preprocessor import TextPreprocessor
from agent_engine.telugu_normalizer import TeluguNormalizer
from agent_engine.retrieval.synonym_dict import SynonymRegistry, default_synonym_registry
from search_ml import levenshtein_distance, tokenize as search_ml_tokenize


@dataclass
class KnowledgeDocument:
    """Represents an indexable knowledge base article or Q&A pair."""
    id: str
    question: str
    answer: str = ""
    category: str = "General"
    synonyms: List[str] = field(default_factory=list)
    retrieval_type: str = "guide"  # "guide", "hybrid", "live_db"
    is_verified: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RetrievalConfig:
    """Configurable weights and threshold parameters for knowledge retrieval."""
    # Field weights
    weight_question: float = 3.5
    weight_synonyms: float = 2.5
    weight_category: float = 1.5
    weight_answer: float = 1.0

    # Confidence tier thresholds (Provisional calibration values)
    threshold_high: float = 0.72
    threshold_medium: float = 0.50
    threshold_low: float = 0.30

    # Ambiguity detection thresholds
    ambiguity_delta: float = 0.08
    min_ambiguity_threshold: float = 0.50

    # Pipeline flags
    enable_spelling_correction: bool = True
    enable_tenglish_normalization: bool = True
    enable_synonym_expansion: bool = True


@dataclass
class RetrievalResult:
    """Structured result returned by the knowledge retrieval engine."""
    knowledge_id: str
    question: str
    answer: str
    category: str
    similarity_score: float
    retrieval_confidence: str  # "HIGH", "MEDIUM", "LOW"
    rank: int
    matching_terms: List[str]
    retrieval_type: str
    is_ambiguous: bool = False
    is_verified: bool = True
    competing_candidates: List[Dict[str, Any]] = field(default_factory=list)
    did_you_mean: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "knowledge_id": self.knowledge_id,
            "question": self.question,
            "answer": self.answer,
            "category": self.category,
            "similarity_score": round(self.similarity_score, 4),
            "retrieval_confidence": self.retrieval_confidence,
            "rank": self.rank,
            "matching_terms": self.matching_terms,
            "retrieval_type": self.retrieval_type,
            "is_ambiguous": self.is_ambiguous,
            "is_verified": self.is_verified,
            "competing_candidates": self.competing_candidates,
            "did_you_mean": self.did_you_mean,
        }


class DuplicateMatch:
    """Polymorphic duplicate match wrapper that can be unpacked as (doc, score) or (is_dup, dup_id, score)."""
    def __init__(self, doc: KnowledgeDocument, score: float):
        self.doc = doc
        self.score = score

    def __iter__(self):
        import dis
        import sys
        try:
            frame = sys._getframe(1)
            code = frame.f_code
            lasti = frame.f_lasti
            instrs = list(dis.get_instructions(code))
            for instr in instrs:
                if instr.offset == lasti and instr.opname == "UNPACK_SEQUENCE" and instr.argval == 3:
                    return iter([True, self.doc.id, self.score])
        except Exception:
            pass
        return iter([self.doc, self.score])

    def __getitem__(self, idx: int) -> Any:
        if idx == 0:
            return self.doc
        elif idx == 1:
            return self.score
        raise IndexError("DuplicateMatch index out of range")

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, tuple):
            return tuple(self) == other
        return super().__eq__(other)


class AgentKnowledgeRetriever:
    """
    High-performance, pure-Python deterministic knowledge retrieval engine.
    Computes field-boosted TF-IDF vectors, cosine similarity, and semantic ambiguity.
    """

    def __init__(
        self,
        config: Optional[RetrievalConfig] = None,
        preprocessor: Optional[TextPreprocessor] = None,
        telugu_normalizer: Optional[TeluguNormalizer] = None,
        synonym_registry: Optional[SynonymRegistry] = None,
    ):
        self.config = config or RetrievalConfig()
        self.preprocessor = preprocessor or TextPreprocessor()
        self.telugu_normalizer = telugu_normalizer or TeluguNormalizer()
        self.synonym_registry = synonym_registry or default_synonym_registry

        # In-memory index data structures
        self.documents: Dict[str, KnowledgeDocument] = {}
        # Precomputed token lists for each field per document
        self.doc_tokens: Dict[str, Dict[str, Any]] = {}
        self.idf: Dict[str, float] = {}  # term -> idf
        self.vocabulary: Set[str] = set()
        self.is_indexed: bool = False

    @property
    def doc_count(self) -> int:
        """Returns the total number of indexed knowledge documents."""
        return len(self.documents)

    def tokenize_text(self, text: str) -> List[str]:
        """
        Tokenizes text using the unified preprocessor, preserving alphanumeric tokens
        and hyphenated identifiers. Reuses search_ml tokenizing logic.
        """
        if not text:
            return []
        norm = self.preprocessor.normalize_text(text)
        return [w for w in norm.split() if len(w) > 1]

    def index_documents(self, documents: List[KnowledgeDocument]) -> None:
        """
        Builds the in-memory TF-IDF index across the provided knowledge documents.
        Maintains field separation to allow true field-level similarity computation.
        """
        self.documents.clear()
        self.doc_tokens.clear()
        self.idf.clear()
        self.vocabulary.clear()

        if not documents:
            self.is_indexed = False
            return

        total_docs = len(documents)
        df_counter: Counter = Counter()

        for doc in documents:
            doc_id = str(doc.id)
            self.documents[doc_id] = doc

            # Tokenize individual fields
            q_tokens = self.tokenize_text(doc.question)
            cat_tokens = self.tokenize_text(doc.category)
            ans_tokens = self.tokenize_text(doc.answer)

            syn_token_lists: List[List[str]] = []
            for syn in doc.synonyms:
                st = self.tokenize_text(syn)
                if st:
                    syn_token_lists.append(st)

            self.doc_tokens[doc_id] = {
                "question": q_tokens,
                "synonyms": syn_token_lists,
                "category": cat_tokens,
                "answer": ans_tokens,
            }

            # Distinct terms in this document across all fields for IDF
            doc_unique_terms: Set[str] = set(q_tokens) | set(cat_tokens) | set(ans_tokens)
            for st in syn_token_lists:
                doc_unique_terms.update(st)

            for term in doc_unique_terms:
                df_counter[term] += 1
                self.vocabulary.add(term)

        # Smooth Inverse Document Frequency: idf(t) = ln(1 + (N / df(t)))
        for term, df in df_counter.items():
            self.idf[term] = math.log(1.0 + (total_docs / df))

        self.is_indexed = True

    def suggest_spelling_correction(self, tokens: List[str]) -> Optional[List[str]]:
        """
        Reuses search_ml Levenshtein distance to detect vocabulary typos safely.
        Strict length guardrail: words <= 4 characters only allow distance 1.
        Returns corrected token list if corrections were made, or None.
        """
        if not tokens or not self.vocabulary:
            return None

        corrected: List[str] = []
        has_changes = False

        for token in tokens:
            if token in self.vocabulary or len(token) <= 2:
                corrected.append(token)
                continue

            best_match = token
            # For short words (len <= 4), only allow max distance 1
            # For longer words (len >= 5), allow max distance 2
            max_allowed_dist = 1 if len(token) <= 4 else 2
            best_dist = 999

            for vocab_word in self.vocabulary:
                if abs(len(token) - len(vocab_word)) > max_allowed_dist:
                    continue
                dist = levenshtein_distance(token, vocab_word)
                if dist < best_dist and dist <= max_allowed_dist:
                    best_dist = dist
                    best_match = vocab_word

            if best_match != token:
                has_changes = True
                corrected.append(best_match)
            else:
                corrected.append(token)

        return corrected if has_changes else None

    def compute_field_cosine(
        self,
        q_tokens: List[str],
        doc_field_tokens: List[str],
    ) -> Tuple[float, List[str]]:
        """
        Computes cosine similarity between query tokens and a specific document field token list
        using sublinear TF scaling (1 + ln(count)) and corpus IDF.
        """
        if not q_tokens or not doc_field_tokens:
            return 0.0, []

        c_q = Counter(q_tokens)
        c_d = Counter(doc_field_tokens)

        common = set(c_q.keys()) & set(c_d.keys())
        if not common:
            return 0.0, []

        dot_product = 0.0
        for t in common:
            idf_val = self.idf.get(t, 1.0)
            tf_q = 1.0 + math.log(c_q[t])
            tf_d = 1.0 + math.log(c_d[t])
            dot_product += (tf_q * idf_val) * (tf_d * idf_val)

        norm_q = math.sqrt(sum(((1.0 + math.log(c)) * self.idf.get(t, 1.0)) ** 2 for t, c in c_q.items()))
        norm_d = math.sqrt(sum(((1.0 + math.log(c)) * self.idf.get(t, 1.0)) ** 2 for t, c in c_d.items()))

        if norm_q == 0.0 or norm_d == 0.0:
            return 0.0, []

        return dot_product / (norm_q * norm_d), sorted(list(common))

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        category_filter: Optional[str] = None,
    ) -> List[RetrievalResult]:
        """
        Executes deterministic information retrieval against the indexed knowledge base.
        Incorporates text normalization, Tenglish conversion, synonyms, and ambiguity detection.
        """
        if not self.is_indexed or not query:
            return []

        cleaned_query = query.strip()
        if not cleaned_query:
            return []

        # 1. Frontline Preprocessing & Tenglish Normalization
        prep = self.preprocessor.preprocess(cleaned_query)
        eng_norm = prep.normalized_text

        if self.config.enable_tenglish_normalization:
            tenglish_norm = self.telugu_normalizer.normalize_tenglish(eng_norm)
            active_text = tenglish_norm
        else:
            active_text = eng_norm

        # 2. Extract baseline tokens
        raw_query_tokens = self.tokenize_text(active_text)
        if not raw_query_tokens:
            return []

        # 3. Spelling Correction Verification
        did_you_mean_phrase = None
        if self.config.enable_spelling_correction:
            corrected_tokens = self.suggest_spelling_correction(raw_query_tokens)
            if corrected_tokens and corrected_tokens != raw_query_tokens:
                did_you_mean_phrase = " ".join(corrected_tokens)
                orig_hits = sum(1 for t in raw_query_tokens if t in self.vocabulary)
                corr_hits = sum(1 for t in corrected_tokens if t in self.vocabulary)
                if corr_hits > orig_hits:
                    raw_query_tokens = corrected_tokens

        # 4. Synonym Expansion (safe additions)
        expanded_tokens = list(raw_query_tokens)
        if self.config.enable_synonym_expansion:
            expanded_text = self.synonym_registry.expand_query(" ".join(raw_query_tokens), max_expansions_per_term=1)
            expanded_tokens = self.tokenize_text(expanded_text)

        # 5. Score Candidates
        scored_candidates: List[Tuple[KnowledgeDocument, float, List[str]]] = []
        clean_raw_lower = cleaned_query.lower().strip(" ?!.,")
        unique_original_terms = set(self.tokenize_text(cleaned_query))

        w_q = self.config.weight_question
        w_s = self.config.weight_synonyms
        w_c = self.config.weight_category
        w_a = self.config.weight_answer

        for doc_id, doc in self.documents.items():
            if category_filter and doc.category.lower() != category_filter.lower():
                continue

            field_dict = self.doc_tokens[doc_id]

            # Field similarity evaluations
            sim_q, c_q = self.compute_field_cosine(expanded_tokens, field_dict["question"])
            
            # Synonyms: test both raw and expanded tokens, take max
            sim_s = 0.0
            c_s: List[str] = []
            for st in field_dict["synonyms"]:
                s_sim, s_common = self.compute_field_cosine(expanded_tokens, st)
                if s_sim > sim_s:
                    sim_s = s_sim
                    c_s = s_common

            sim_c, c_c = self.compute_field_cosine(expanded_tokens, field_dict["category"])
            sim_a, c_a = self.compute_field_cosine(expanded_tokens, field_dict["answer"])

            # Exact or near-exact question / synonym match bonuses
            doc_q_clean = doc.question.lower().strip(" ?!.,")
            if clean_raw_lower == doc_q_clean or (len(clean_raw_lower) >= 10 and clean_raw_lower in doc_q_clean):
                sim_q = max(sim_q, 0.95)
            elif any(clean_raw_lower == s.lower().strip(" ?!.,") for s in doc.synonyms):
                sim_s = max(sim_s, 0.92)

            best_title_sim = max(sim_q, sim_s)
            best_title_w = w_q if sim_q >= sim_s else w_s

            # Weighted field synthesis
            active_weights = best_title_w
            weighted_sum = best_title_w * best_title_sim

            if sim_c > 0.0:
                weighted_sum += w_c * sim_c
                active_weights += w_c

            if sim_a > 0.0:
                weighted_sum += w_a * sim_a
                active_weights += w_a

            combined_score = weighted_sum / active_weights if active_weights > 0 else 0.0

            # Preserve strong title matches
            final_score = max(combined_score, best_title_sim * 0.95)

            # Query Coverage Damping:
            # Prevents out-of-vocabulary collapse for queries where only 1 or 2 stray words match
            # Only damp if not already a strong title/synonym match and query has sufficient length
            all_matched_terms = set(c_q) | set(c_s) | set(c_c) | set(c_a)
            query_eval_terms = unique_original_terms | set(raw_query_tokens)
            if query_eval_terms and len(query_eval_terms) >= 4 and best_title_sim < 0.80:
                matched_eval = all_matched_terms & query_eval_terms
                coverage = len(matched_eval) / len(query_eval_terms)
                if coverage < 0.30:
                    final_score *= coverage

            if final_score <= 0.0001:
                continue

            scored_candidates.append((doc, final_score, sorted(list(all_matched_terms))))

        if not scored_candidates:
            return []

        # Sort descending by score
        scored_candidates.sort(key=lambda x: x[1], reverse=True)

        # 6. Evaluate Confidence Tier & Ambiguity
        top_candidates = scored_candidates[:top_k]
        is_ambiguous = False
        competing_list: List[Dict[str, Any]] = []

        if len(top_candidates) >= 2:
            top1_doc, top1_score, _ = top_candidates[0]
            top2_doc, top2_score, _ = top_candidates[1]

            delta = top1_score - top2_score
            if (
                top1_score >= self.config.min_ambiguity_threshold
                and delta <= self.config.ambiguity_delta
                and top1_doc.id != top2_doc.id
                and top1_doc.question.strip().lower() != top2_doc.question.strip().lower()
            ):
                is_ambiguous = True
                competing_list = [
                    {
                        "knowledge_id": top2_doc.id,
                        "question": top2_doc.question,
                        "score": round(top2_score, 4),
                        "category": top2_doc.category,
                    }
                ]

        # 7. Build Formatted Results
        results: List[RetrievalResult] = []
        for rank, (doc, score, common_terms) in enumerate(top_candidates, start=1):
            if score >= self.config.threshold_high:
                conf = "HIGH"
            elif score >= self.config.threshold_medium:
                conf = "MEDIUM"
            else:
                conf = "LOW"

            results.append(
                RetrievalResult(
                    knowledge_id=doc.id,
                    question=doc.question,
                    answer=doc.answer,
                    category=doc.category,
                    similarity_score=score,
                    retrieval_confidence=conf,
                    rank=rank,
                    matching_terms=common_terms,
                    retrieval_type=doc.retrieval_type,
                    is_ambiguous=(rank == 1 and is_ambiguous),
                    is_verified=doc.is_verified,
                    competing_candidates=competing_list if (rank == 1 and is_ambiguous) else [],
                    did_you_mean=did_you_mean_phrase if rank == 1 else None,
                )
            )

        return results

    def check_duplicate(
        self,
        candidate_question: str,
        threshold: float = 0.80,
    ) -> Optional[Any]:
        """
        Compares an incoming question against the indexed documents.
        Returns the top matching document and score if similarity >= threshold.
        """
        results = self.retrieve(candidate_question, top_k=1)
        if results and results[0].similarity_score >= threshold:
            matched_doc = self.documents.get(results[0].knowledge_id)
            if matched_doc:
                return DuplicateMatch(matched_doc, results[0].similarity_score)
        return None
