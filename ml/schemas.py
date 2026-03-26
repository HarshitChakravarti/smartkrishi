"""Pydantic schemas matching the exact payload emitted by InputForm.jsx."""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class TabMode(str, Enum):
    CURRENT = "current"
    PLANNING = "planning"


class PredictionRequest(BaseModel):
    """Accept the exact JSON payload from InputForm.jsx."""

    activeTab: TabMode

    state: str = Field(..., min_length=1)
    district: str = Field(..., min_length=1)
    landArea: str | float = Field(...)

    temperature: Optional[float] = None
    humidity: Optional[float] = None
    rainfall: Optional[float] = None

    farmingMonth: Optional[str] = None
    previousCrop: Optional[str] = None
    previousCropMonth: Optional[str] = None

    N: float = Field(..., ge=0, le=200)
    P: float = Field(..., ge=0, le=200)
    K: float = Field(..., ge=0, le=200)
    pH: float = Field(..., ge=0, le=14)

    @field_validator("state", "district", "farmingMonth", "previousCrop", "previousCropMonth", mode="before")
    @classmethod
    def _strip_strings(cls, value: Any) -> Any:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("landArea", mode="before")
    @classmethod
    def parse_land_area(cls, value: Any) -> float:
        """Parse numeric farm size from string payload."""
        try:
            numeric = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid land area: {value}. Must be a positive number.") from exc
        if numeric <= 0:
            raise ValueError("Land area must be positive")
        return numeric

    @model_validator(mode="after")
    def validate_mode_fields(self) -> "PredictionRequest":
        """Enforce mode-specific required fields."""
        if self.activeTab == TabMode.CURRENT:
            if self.temperature is None:
                raise ValueError("Temperature required in current conditions mode")
            if self.humidity is None:
                raise ValueError("Humidity required in current conditions mode")
            if self.rainfall is None:
                raise ValueError("Rainfall required in current conditions mode")

        if self.activeTab == TabMode.PLANNING:
            if not self.farmingMonth:
                raise ValueError("Farming month required in crop planning mode")
            if not self.previousCrop:
                raise ValueError("Previous crop required in crop planning mode")
            if not self.previousCropMonth:
                raise ValueError("Previous crop month required in crop planning mode")

        return self

    @property
    def farm_size_float(self) -> float:
        return float(self.landArea)

    @property
    def mode(self) -> str:
        return self.activeTab.value


class Advisory(BaseModel):
    irrigation: str
    fertilizer: str
    pest_watch: str
    weather_note: str


class CropRecommendation(BaseModel):
    rank: int
    crop: str
    confidence: float = Field(..., ge=0, le=1)
    ml_score: float
    rule_adjustment: str
    season: str
    growing_duration: str
    reason: str
    advisories: Advisory


class ClimateInfo(BaseModel):
    temperature: float
    humidity: float
    rainfall: float
    source: str
    months_covered: Optional[list[str]] = None


class PredictionResponse(BaseModel):
    success: bool
    mode: str
    input_summary: dict
    climate_used: ClimateInfo
    recommendations: list[CropRecommendation]
    metadata: dict
