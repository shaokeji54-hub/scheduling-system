from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PositionTimeSlotCreate(BaseModel):
    position_id: int
    start_hour: int = 9
    end_hour: int = 18


class PositionTimeSlotUpdate(BaseModel):
    start_hour: int | None = None
    end_hour: int | None = None


class PositionTimeSlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    position_id: int
    position_name: str | None = None
    start_hour: int
    end_hour: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
