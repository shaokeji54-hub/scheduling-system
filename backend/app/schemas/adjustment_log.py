from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AdjustmentLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    schedule_week_id: int | None = None
    operator_name: str | None = None
    change_detail: str
    reason: str
    created_at: datetime | None = None
