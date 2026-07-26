from datetime import datetime
from pydantic import BaseModel, ConfigDict


class EmployeeBase(BaseModel):
    name: str
    email: str
    role: str = "employee"
    primary_position_id: int


class EmployeeCreate(EmployeeBase):
    password: str


class EmployeeUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    primary_position_id: int | None = None
    is_active: int | None = None
    skill_ids: list[int] | None = None  # cross-training position ids


class EmployeeResponse(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: int
    comp_time_balance: float
    weekly_hours: float
    monthly_overtime: float
    skill_ids: list[int] = []
    primary_position_name: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class EmployeeSkillUpdate(BaseModel):
    skill_ids: list[int]
