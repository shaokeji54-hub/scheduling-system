from datetime import date, datetime, time
from pydantic import BaseModel, ConfigDict


class UnavailableTimeCreate(BaseModel):
    date: date
    start_time: time
    end_time: time
    reason: str = ""


class UnavailableTimeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    date: date
    start_time: time
    end_time: time
    reason: str
    created_at: datetime | None = None
