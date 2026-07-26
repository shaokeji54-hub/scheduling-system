from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class HourlyReqCreate(BaseModel):
    position_id: int
    date: date
    hour: int
    required_headcount: int


class HourlyReqBatchCreate(BaseModel):
    items: list[HourlyReqCreate]


class HourlyReqQuery(BaseModel):
    position_id: int | None = None
    start_date: date
    end_date: date


class HourlyReqResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    position_id: int
    date: date
    hour: int
    required_headcount: int
    position_name: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
