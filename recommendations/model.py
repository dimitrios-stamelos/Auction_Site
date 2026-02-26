from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Sequence, Tuple

import numpy as np


Interaction = Tuple[str, str, float]


@dataclass
class Recommendation:
    item_id: str
    score: float
    reason: str


class MatrixFactorizationRecommender:
    """Simple explicit-feedback matrix factorisation recommender.

    The implementation is intentionally framework-free so it can be inspected
    and extended easily for academic assignments. It uses stochastic gradient
    descent to optimise the squared error between observed interactions and the
    reconstructed user/item latent factors.
    """

    def __init__(
        self,
        n_factors: int = 20,
        n_epochs: int = 30,
        learning_rate: float = 0.01,
        regularisation: float = 0.05,
        random_state: int = 42,
    ) -> None:
        self.n_factors = n_factors
        self.n_epochs = n_epochs
        self.learning_rate = learning_rate
        self.regularisation = regularisation
        self.random_state = random_state

        # Model state – populated after fit
        self.user_to_index: Dict[str, int] = {}
        self.item_to_index: Dict[str, int] = {}
        self.index_to_user: List[str] = []
        self.index_to_item: List[str] = []
        self.user_factors: np.ndarray | None = None
        self.item_factors: np.ndarray | None = None
        self.item_bias: np.ndarray | None = None
        self.global_mean: float = 0.0
        self.interactions_by_user: Dict[str, set[str]] = {}
        self.item_popularity: List[Tuple[str, int]] = []
        self._trained: bool = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def fit(self, interactions: Sequence[Interaction]) -> None:
        if not interactions:
            raise ValueError("Cannot train recommender with no interactions")

        self._prepare_mappings(interactions)
        rng = np.random.default_rng(self.random_state)

        n_users = len(self.user_to_index)
        n_items = len(self.item_to_index)

        self.user_factors = rng.normal(0.0, 0.1, size=(n_users, self.n_factors))
        self.item_factors = rng.normal(0.0, 0.1, size=(n_items, self.n_factors))
        self.item_bias = np.zeros(n_items, dtype=np.float64)

        ratings = np.array([rating for _, _, rating in interactions], dtype=np.float64)
        self.global_mean = float(ratings.mean()) if len(ratings) else 0.0

        indexed_interactions = [
            (self.user_to_index[user], self.item_to_index[item], float(rating))
            for user, item, rating in interactions
        ]

        lr = self.learning_rate
        reg = self.regularisation

        for _ in range(self.n_epochs):
            rng.shuffle(indexed_interactions)
            for u_idx, i_idx, rating in indexed_interactions:
                pred = self._predict_index(u_idx, i_idx)
                err = rating - pred

                # Gradient descent updates
                user_vec = self.user_factors[u_idx]
                item_vec = self.item_factors[i_idx]

                self.user_factors[u_idx] += lr * (err * item_vec - reg * user_vec)
                self.item_factors[i_idx] += lr * (err * user_vec - reg * item_vec)
                self.item_bias[i_idx] += lr * (err - reg * self.item_bias[i_idx])

        self._trained = True

    def add_interactions(self, interactions: Iterable[Interaction]) -> None:
        """Add extra interactions to the existing model.

        We simply append them to the stored interaction cache and retrain on the
        next call to :meth:`fit`. This keeps the implementation simple; if you
        need incremental learning, extend this class accordingly.
        """

        if not hasattr(self, "_cached_interactions"):
            self._cached_interactions: List[Interaction] = []
        self._cached_interactions.extend(interactions)

    def recommend(self, user_id: str, *, top_n: int = 10) -> List[Recommendation]:
        if not self._trained or self.user_factors is None or self.item_factors is None:
            raise RuntimeError("Model has not been trained yet")

        top_n = max(1, top_n)
        seen_items = self.interactions_by_user.get(user_id, set())

        if user_id not in self.user_to_index:
            return self._popular_fallback(seen_items, top_n)

        user_idx = self.user_to_index[user_id]
        scores = self.item_factors @ self.user_factors[user_idx]
        scores = scores + self.item_bias + self.global_mean

        for item in seen_items:
            if item in self.item_to_index:
                scores[self.item_to_index[item]] = -np.inf

        if np.all(np.isneginf(scores)):
            return self._popular_fallback(seen_items, top_n)

        top_indices = np.argpartition(-scores, min(top_n, len(scores) - 1))[:top_n]
        sorted_idx = top_indices[np.argsort(scores[top_indices])[::-1]]

        return [
            Recommendation(
                item_id=self.index_to_item[idx],
                score=float(scores[idx]),
                reason="personalised",
            )
            for idx in sorted_idx
            if not np.isneginf(scores[idx])
        ]

    def most_popular(self, top_n: int = 10) -> List[Recommendation]:
        if not self.item_popularity:
            return []
        top_n = max(1, top_n)
        result = []
        for item_id, count in self.item_popularity[:top_n]:
            result.append(Recommendation(item_id=item_id, score=float(count), reason="popular"))
        return result

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _prepare_mappings(self, interactions: Sequence[Interaction]) -> None:
        self.user_to_index.clear()
        self.item_to_index.clear()
        self.index_to_user.clear()
        self.index_to_item.clear()
        self.interactions_by_user = {}

        if hasattr(self, "_cached_interactions") and self._cached_interactions:
            interactions = list(interactions) + self._cached_interactions

        for user, item, _ in interactions:
            if user not in self.user_to_index:
                self.user_to_index[user] = len(self.index_to_user)
                self.index_to_user.append(user)
            if item not in self.item_to_index:
                self.item_to_index[item] = len(self.index_to_item)
                self.index_to_item.append(item)
            self.interactions_by_user.setdefault(user, set()).add(item)

        # Popularity for cold-start fallback
        popularity_counter: Dict[str, int] = {}
        for _, item, _ in interactions:
            popularity_counter[item] = popularity_counter.get(item, 0) + 1
        self.item_popularity = sorted(popularity_counter.items(), key=lambda kv: kv[1], reverse=True)

    def _predict_index(self, user_idx: int, item_idx: int) -> float:
        score = self.global_mean
        if self.user_factors is None or self.item_factors is None or self.item_bias is None:
            return score
        score += float(self.item_bias[item_idx])
        score += float(self.user_factors[user_idx] @ self.item_factors[item_idx])
        return score

    def _popular_fallback(self, seen_items: set[str], top_n: int) -> List[Recommendation]:
        if not self.item_popularity:
            return []
        picks: List[Recommendation] = []
        for item_id, count in self.item_popularity:
            if item_id in seen_items:
                continue
            picks.append(Recommendation(item_id=item_id, score=float(count), reason="popular"))
            if len(picks) >= top_n:
                break
        return picks
