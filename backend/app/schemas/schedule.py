from datetime import date, datetime, time
from pydantic import BaseModel, ConfigDict


class ShiftAssignmentCreate(BaseModel):
    employee_id: int
    position_id: int
    date: date
    shift_start: time
    shift_end: time
    status: str = "preliminary"
    is_overnight: bool = False


class ShiftAssignmentUpdate(BaseModel):
    shift_start: time | None = None
    shift_end: time | None = None
    position_id: int | None = None
    status: str | None = None
    is_overnight: bool | None = None


class ShiftAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    employee_name: str | None = None
    position_id: int
    position_name: str | None = None
    date: date
    shift_start: time
    shift_end: time
    status: str
    warning_flags: str
    is_overnight: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ScheduleWeekResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    week_start: date
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ScheduleGenerateRequest(BaseModel):
    week_start: date
    is_preview: bool = False


class CoverageGap(BaseModel):
    position_id: int
    position_name: str
    date: date
    hour: int
    required: int
    actual: int


class WarningItem(BaseModel):
    employee_id: int
    employee_name: str
    warning_type: str
    detail: str


class ScheduleGenerateResponse(BaseModel):
    success: bool
    message: str
    assignments: list[ShiftAssignmentResponse] = []
    coverage_gaps: list[CoverageGap] = []
    warnings: list[WarningItem] = []
    infeasible_reasons: list[str] = []
