from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field, validator


class TrainRequest(BaseModel):
    dataset_dir: Optional[str] = Field(None, description="Path to dataset directory containing items-*.xml files")
    implicit_value: float = Field(1.0, ge=0.0, description="Default rating value when only implicit feedback is available")

    @validator("dataset_dir")
    def _validate_dataset(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        path = Path(value)
        if not path.exists():
            raise ValueError(f"Dataset directory does not exist: {value}")
        return value


class InteractionPayload(BaseModel):
    user_id: str
    item_id: str
    value: float = Field(1.0, ge=0.0)


class InteractionBatch(BaseModel):
    interactions: List[InteractionPayload]


class RecommendationRequest(BaseModel):
    user_id: str
    limit: int = Field(10, ge=1, le=100)


class RecommendationItem(BaseModel):
    item_id: str
    score: float
    reason: str


class RecommendationResponse(BaseModel):
    user_id: str
    items: List[RecommendationItem]


class PopularResponse(BaseModel):
    items: List[RecommendationItem]
