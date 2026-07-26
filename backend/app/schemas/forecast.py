from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class ForecastCreate(BaseModel):
    position_id: int
    date: date
    daily_volume: int


class ForecastBatchCreate(BaseModel):
    items: list[ForecastCreate]


class ForecastQuery(BaseModel):
    position_id: int | None = None
    start_date: date
    end_date: date


class ForecastResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    position_id: int
    date: date
    daily_volume: int
    position_name: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
