from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PositionBase(BaseModel):
    name: str
    description: str = ""


class PositionCreate(PositionBase):
    pass


class PositionUpdate(PositionBase):
    name: str | None = None
    description: str | None = None


class PositionResponse(PositionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
