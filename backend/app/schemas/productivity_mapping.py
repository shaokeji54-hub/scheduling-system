from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ProductivityMappingCreate(BaseModel):
    position_id: int
    productivity_value: float
    unit: str = "per_hour"  # per_hour | per_shift


class ProductivityMappingUpdate(BaseModel):
    productivity_value: float | None = None
    unit: str | None = None


class ProductivityMappingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    position_id: int
    position_name: str | None = None
    productivity_value: float
    unit: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CalculateStaffingRequest(BaseModel):
    position_id: int
    date: str  # YYYY-MM-DD


class CalculateStaffingResponse(BaseModel):
    position_id: int
    position_name: str
    date: str
    daily_volume: int
    productivity_value: float
    unit: str
    required_headcount: float
    hourly_breakdown: list[dict] | None = None
