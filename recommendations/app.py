from __future__ import annotations

import asyncio
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException

from data_loader import load_interactions
from model import MatrixFactorizationRecommender, Recommendation
from schemas import (
    InteractionBatch,
    PopularResponse,
    RecommendationRequest,
    RecommendationResponse,
    TrainRequest,
    RecommendationItem,
)


DEFAULT_DATASET = Path(__file__).resolve().parent / "ebay"


class RecommendationServiceState:
    def __init__(self) -> None:
        self.recommender = MatrixFactorizationRecommender()
        self.interactions = []
        self.lock = asyncio.Lock()
        self.trained = False


state = RecommendationServiceState()
app = FastAPI(title="Auction Recommendation Service", version="0.1.0")


def _recommendations_to_schema(user_id: str, recommendations: List[Recommendation]) -> RecommendationResponse:
    return RecommendationResponse(
        user_id=user_id,
        items=[RecommendationItem(item_id=r.item_id, score=r.score, reason=r.reason) for r in recommendations],
    )


@app.on_event("startup")
async def startup() -> None:
    if DEFAULT_DATASET.exists():
        try:
            interactions = load_interactions(DEFAULT_DATASET)
        except Exception as exc:  # noqa: BLE001 - we want to surface unexpected errors
            print(f"[WARN] Failed to load default dataset: {exc}")
            return

        if interactions:
            async with state.lock:
                state.interactions = interactions
                state.recommender.fit(interactions)
                state.trained = True
            print(f"[recs] Loaded recommender with {len(interactions)} interactions")
        else:
            # Bootstrap with synthetic interactions mapped to app auction ids 1..100
            synthetic = [("__bootstrap__", str(i), float(1 + (i % 5))) for i in range(1, 101)]
            async with state.lock:
                state.interactions = synthetic
                state.recommender.fit(synthetic)
                state.trained = True
            print("[recs] Dataset had no interactions; bootstrapped model with synthetic signals")
    else:
        print(f"[INFO] Dataset directory not found at {DEFAULT_DATASET}. Waiting for /train call.")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "trained": state.trained, "interactions": len(state.interactions)}


@app.post("/train")
async def train(request: TrainRequest) -> dict:
    dataset_dir = Path(request.dataset_dir) if request.dataset_dir else DEFAULT_DATASET
    if not dataset_dir.exists():
        raise HTTPException(status_code=400, detail=f"Dataset directory not found: {dataset_dir}")

    interactions = load_interactions(dataset_dir, implicit_value=request.implicit_value)
    if not interactions:
        raise HTTPException(status_code=400, detail="No interactions parsed from dataset")

    async with state.lock:
        state.recommender.fit(interactions)
        state.interactions = interactions
        state.trained = True

    return {"trained": True, "interaction_count": len(interactions)}


@app.post("/interactions")
async def ingest_interactions(batch: InteractionBatch) -> dict:
    if not batch.interactions:
        return {"received": 0}

    async with state.lock:
        for record in batch.interactions:
            state.interactions.append((record.user_id, record.item_id, record.value))
        # Re-train with the accumulated dataset for now
        state.recommender.fit(state.interactions)
        state.trained = True

    return {"received": len(batch.interactions), "trained": state.trained}


@app.post("/recommendations", response_model=RecommendationResponse)
async def recommend(payload: RecommendationRequest) -> RecommendationResponse:
    if not state.trained:
        raise HTTPException(status_code=503, detail="Recommender not trained yet")

    recommendations = state.recommender.recommend(payload.user_id, top_n=payload.limit)
    return _recommendations_to_schema(payload.user_id, recommendations)


@app.get("/popular", response_model=PopularResponse)
async def popular(limit: int = 10) -> PopularResponse:
    if not state.trained:
        raise HTTPException(status_code=503, detail="Recommender not trained yet")
    items = state.recommender.most_popular(limit)
    return PopularResponse(items=[RecommendationItem(item_id=r.item_id, score=r.score, reason=r.reason) for r in items])
