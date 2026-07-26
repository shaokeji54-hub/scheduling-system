from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class LeaveRequestCreate(BaseModel):
    leave_date: date
    leave_type: str = "annual"
    employee_id: int | None = None
    creator_type: str = "employee"


class LeaveRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    employee_name: str | None = None
    leave_date: date
    leave_type: str
    status: str
    rejection_reason: str | None = None
    submit_feedback: str | None = None
    creator_type: str = "employee"
    creator_name: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class LeaveRequestReview(BaseModel):
    status: str
    rejection_reason: str | None = None
