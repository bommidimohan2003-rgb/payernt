"""
ML-Powered Search Engine Module for Payent using TF-IDF & Cosine Similarity.
Provides semantic relevance scoring, personalization re-ranking based on user events,
and spelling error correction ("Did you mean?").
"""

import math
import re
from collections import Counter, defaultdict
from typing import Dict, List, Optional, Tuple, Set

def tokenize(text: str) -> List[str]:
    """Tokenize and normalize text into lowercase words."""
    if not text:
        return []
    # Replace non-alphanumeric characters with spaces
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
    return [w for w in cleaned.split() if len(w) > 1]

def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


class MLSearchEngine:
    def __init__(self):
        self.products: List[Dict] = []
        self.doc_vectors: Dict[str, Dict[str, float]] = {}  # product_id -> {term: tfidf}
        self.idf: Dict[str, float] = {}
        self.vocabulary: Set[str] = set()
        self.category_products: Dict[str, List[str]] = defaultdict(list)
        self.is_indexed: bool = False

    @property
    def total_documents(self) -> int:
        """Total number of indexed products in the search engine."""
        return len(self.products)

    def build_index(self, products: List[Dict]):
        """
        Build TF-IDF search index from product list.
        Product fields indexed: title (weight 3.0), category (weight 2.0), description (weight 1.0)
        """
        self.products = products
        self.doc_vectors.clear()
        self.idf.clear()
        self.vocabulary.clear()
        self.category_products.clear()

        if not products:
            self.is_indexed = False
            return

        total_docs = len(products)
        doc_term_freqs: Dict[str, Counter] = {}
        doc_freqs: Counter = Counter()

        for p in products:
            pid = str(p["id"])
            self.category_products[p.get("category", "")].append(pid)

            # Build weighted document text
            title_tokens = tokenize(p.get("title", ""))
            cat_tokens = tokenize(p.get("category", ""))
            desc_tokens = tokenize(p.get("description", ""))

            # Term frequency with field weighting
            tf = Counter()
            for t in title_tokens:
                tf[t] += 3.0
            for t in cat_tokens:
                tf[t] += 2.0
            for t in desc_tokens:
                tf[t] += 1.0

            doc_term_freqs[pid] = tf

            # Track unique terms per doc for IDF
            unique_terms = set(tf.keys())
            for t in unique_terms:
                doc_freqs[t] += 1
                self.vocabulary.add(t)

        # Compute IDF: idf(t) = log(1 + (N / df(t)))
        for term, df in doc_freqs.items():
            self.idf[term] = math.log(1.0 + (total_docs / df))

        # Compute TF-IDF vector for each document
        for pid, tf in doc_term_freqs.items():
            vector = {}
            for term, count in tf.items():
                # Sublinear TF scaling: 1 + log(tf)
                tf_scaled = 1.0 + math.log(count)
                vector[term] = tf_scaled * self.idf.get(term, 0.0)
            self.doc_vectors[pid] = vector

        self.is_indexed = True

    def _vectorize_query(self, query_tokens: List[str]) -> Dict[str, float]:
        """Convert query tokens into a TF-IDF vector."""
        tf = Counter(query_tokens)
        q_vec = {}
        for term, count in tf.items():
            if term in self.idf:
                tf_scaled = 1.0 + math.log(count)
                q_vec[term] = tf_scaled * self.idf[term]
        return q_vec

    def _cosine_similarity(self, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        """Calculate cosine similarity between query vector and document vector."""
        common_terms = set(vec1.keys()) & set(vec2.keys())
        if not common_terms:
            return 0.0

        dot_product = sum(vec1[t] * vec2[t] for t in common_terms)
        norm1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
        norm2 = math.sqrt(sum(v ** 2 for v in vec2.values()))

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def suggest_spelling_correction(self, query: str) -> Optional[str]:
        """Suggest closest vocabulary match if query tokens are misspelled."""
        tokens = tokenize(query)
        if not tokens or not self.vocabulary:
            return None

        corrected_tokens = []
        has_correction = False

        for token in tokens:
            if token in self.vocabulary:
                corrected_tokens.append(token)
                continue

            # Find closest matching word in vocabulary
            best_match = token
            best_dist = float('inf')

            for vocab_word in self.vocabulary:
                if abs(len(token) - len(vocab_word)) > 2:
                    continue
                dist = levenshtein_distance(token, vocab_word)
                if dist < best_dist and dist <= 2:
                    best_dist = dist
                    best_match = vocab_word

            if best_match != token:
                has_correction = True
                corrected_tokens.append(best_match)
            else:
                corrected_tokens.append(token)

        return " ".join(corrected_tokens) if has_correction else None

    def search(
        self,
        query: str,
        category: Optional[str] = None,
        user_affinities: Optional[Dict[str, float]] = None,
        limit: int = 20
    ) -> Dict:
        """
        Search documents using TF-IDF + Cosine Similarity with personalization re-ranking.
        Returns:
            {
                "results": [...ranked products...],
                "did_you_mean": Optional[str],
                "total": int
            }
        """
        query = (query or "").strip()
        category = (category or "").strip()
        if category == "all":
            category = None

        # Handle empty query - filter by category if provided, otherwise return indexed products
        if not query:
            filtered = [
                p for p in self.products
                if not category or p.get("category") == category
            ]
            return {
                "results": filtered[:limit],
                "did_you_mean": None,
                "total": len(filtered)
            }

        q_tokens = tokenize(query)
        did_you_mean = self.suggest_spelling_correction(query)

        # If query tokens resulted in 0 vocabulary matches, check if correction helps
        q_vec = self._vectorize_query(q_tokens)
        if not q_vec and did_you_mean:
            q_tokens = tokenize(did_you_mean)
            q_vec = self._vectorize_query(q_tokens)

        if not q_vec:
            # Fallback to substring matching on raw products if TF-IDF yields no vector
            fallback_results = []
            q_lower = query.lower()
            for p in self.products:
                if category and p.get("category") != category:
                    continue
                t_lower = (p.get("title") or "").lower()
                d_lower = (p.get("description") or "").lower()
                c_lower = (p.get("category") or "").lower()
                if q_lower in t_lower or q_lower in d_lower or q_lower in c_lower:
                    fallback_results.append(p)
            return {
                "results": fallback_results[:limit],
                "did_you_mean": did_you_mean,
                "total": len(fallback_results)
            }

        # Score documents with TF-IDF cosine similarity
        scored: List[Tuple[Dict, float]] = []

        for p in self.products:
            # Apply category filter
            if category and p.get("category") != category:
                continue

            pid = str(p["id"])
            doc_vec = self.doc_vectors.get(pid, {})
            base_score = self._cosine_similarity(q_vec, doc_vec)

            # Extra exact phrase title boost
            title_lower = p.get("title", "").lower()
            if query.lower() in title_lower:
                base_score += 0.35

            if base_score <= 0.0001:
                continue

            # Personalization Re-ranking: boost score if user has category affinity
            final_score = base_score
            p_cat = p.get("category", "")
            if user_affinities and p_cat in user_affinities:
                affinity_multiplier = 1.0 + min(user_affinities[p_cat] * 0.15, 0.45) # max +45% boost
                final_score *= affinity_multiplier

            scored.append((p, final_score))

        # Sort by relevance score descending
        scored.sort(key=lambda x: x[1], reverse=True)

        results = [item[0] for item in scored[:limit]]

        return {
            "results": results,
            "did_you_mean": did_you_mean,
            "total": len(scored)
        }

# Global Search Engine Instance
ml_search_engine = MLSearchEngine()
