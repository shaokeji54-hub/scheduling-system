from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from datetime import date, timedelta

from app.database import get_db
from app.models.schedule import ShiftAssignment, ScheduleWeek
from app.models.employee import Employee
from app.models.position import Position
from app.schemas.schedule import (
    ShiftAssignmentCreate, ShiftAssignmentUpdate, ShiftAssignmentResponse,
    ScheduleWeekResponse, ScheduleGenerateRequest, ScheduleGenerateResponse,
    CoverageGap, WarningItem,
)
from app.services.scheduler_service import SchedulerService
from app.services.auth import get_current_employee

router = APIRouter(prefix="/api/schedules", tags=["Schedules"])


@router.get("/weeks", response_model=list[ScheduleWeekResponse])
async def list_weeks(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(ScheduleWeek).order_by(ScheduleWeek.week_start.desc()))
    return result.scalars().all()


@router.post("/generate")
async def generate_schedule(req: ScheduleGenerateRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    # Delete existing week if re-generating
    try:
        existing = await db.execute(
            select(ScheduleWeek).where(ScheduleWeek.week_start == req.week_start)
        )
        existing_week = existing.scalar_one_or_none()
        if existing_week:
            from sqlalchemy import delete
            await db.execute(
                delete(ShiftAssignment).where(ShiftAssignment.schedule_week_id == existing_week.id)
            )
            await db.delete(existing_week)
            await db.flush()
    except Exception:
        pass

    try:
        result = await SchedulerService.run_engine(db, req.week_start)
    except Exception as e:
        import traceback; tb = traceback.format_exc()
        return {"success": False, "message": str(e), "debug": tb}

    assignments = []
    for a in result.assignments:
        emp_result = await db.execute(select(Employee).where(Employee.id == a.employee_id))
        emp = emp_result.scalar_one_or_none()
        pos_result = await db.execute(select(Position).where(Position.id == a.position_id))
        pos = pos_result.scalar_one_or_none()
        assignments.append(ShiftAssignmentResponse(
            id=0, employee_id=a.employee_id, employee_name=emp.name if emp else "",
            position_id=a.position_id, position_name=pos.name if pos else "",
            date=a.date, shift_start=a.shift_start, shift_end=a.shift_end,
            status="preliminary", warning_flags=",".join(a.warning_flags),
        ))

    gaps = []
    for g in result.coverage_gaps:
        if "position_name" not in g:
            pos_result = await db.execute(select(Position).where(Position.id == g.get("position_id")))
            p = pos_result.scalar_one_or_none()
            g["position_name"] = p.name if p else ""
        gaps.append(CoverageGap(**g))
    warnings = [WarningItem(**w) for w in result.warnings]

    return ScheduleGenerateResponse(
        success=result.success, message=result.message,
        assignments=assignments, coverage_gaps=gaps,
        warnings=warnings, infeasible_reasons=result.infeasible_reasons,
    )


@router.get("/week/{week_start}", response_model=list[ShiftAssignmentResponse])
async def get_week_schedule(week_start: str, db: Annotated[AsyncSession, Depends(get_db)]):
    ws = date.fromisoformat(week_start)
    we = ws + timedelta(days=7)
    result = await db.execute(
        select(ShiftAssignment).where(
            ShiftAssignment.date >= ws, ShiftAssignment.date < we,
        )
    )
    items = []
    for a in result.scalars().all():
        emp_result = await db.execute(select(Employee).where(Employee.id == a.employee_id))
        emp = emp_result.scalar_one_or_none()
        pos_result = await db.execute(select(Position).where(Position.id == a.position_id))
        pos = pos_result.scalar_one_or_none()
        items.append(ShiftAssignmentResponse(
            id=a.id, employee_id=a.employee_id, employee_name=emp.name if emp else "",
            position_id=a.position_id, position_name=pos.name if pos else "",
            date=a.date, shift_start=a.shift_start, shift_end=a.shift_end,
            status=a.status, warning_flags=a.warning_flags,
            created_at=a.created_at, updated_at=a.updated_at,
        ))
    return items


@router.put("/assignments/{assignment_id}", response_model=ShiftAssignmentResponse)
async def update_assignment(assignment_id: int, data: ShiftAssignmentUpdate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(ShiftAssignment).where(ShiftAssignment.id == assignment_id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if data.shift_start is not None:
        a.shift_start = data.shift_start
    if data.shift_end is not None:
        a.shift_end = data.shift_end
    if data.position_id is not None:
        a.position_id = data.position_id
    if data.status is not None:
        a.status = data.status
    await db.flush()
    await db.refresh(a)

    emp_result = await db.execute(select(Employee).where(Employee.id == a.employee_id))
    emp = emp_result.scalar_one_or_none()
    pos_result = await db.execute(select(Position).where(Position.id == a.position_id))
    pos = pos_result.scalar_one_or_none()
    return ShiftAssignmentResponse(
        id=a.id, employee_id=a.employee_id, employee_name=emp.name if emp else "",
        position_id=a.position_id, position_name=pos.name if pos else "",
        date=a.date, shift_start=a.shift_start, shift_end=a.shift_end,
        status=a.status, warning_flags=a.warning_flags,
        created_at=a.created_at, updated_at=a.updated_at,
    )


@router.post("/assignments", response_model=ShiftAssignmentResponse)
async def create_assignment(data: ShiftAssignmentCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    a = ShiftAssignment(
        employee_id=data.employee_id, position_id=data.position_id,
        date=data.date, shift_start=data.shift_start, shift_end=data.shift_end,
        status=data.status,
    )
    db.add(a)
    await db.flush()
    await db.refresh(a)
    emp_result = await db.execute(select(Employee).where(Employee.id == a.employee_id))
    emp = emp_result.scalar_one_or_none()
    pos_result = await db.execute(select(Position).where(Position.id == a.position_id))
    pos = pos_result.scalar_one_or_none()
    return ShiftAssignmentResponse(
        id=a.id, employee_id=a.employee_id, employee_name=emp.name if emp else "",
        position_id=a.position_id, position_name=pos.name if pos else "",
        date=a.date, shift_start=a.shift_start, shift_end=a.shift_end,
        status=a.status, warning_flags=a.warning_flags,
        created_at=a.created_at, updated_at=a.updated_at,
    )


@router.post("/weeks/{week_id}/confirm")
async def confirm_week(week_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(ScheduleWeek).where(ScheduleWeek.id == week_id))
    w = result.scalar_one_or_none()
    if not w:
        raise HTTPException(status_code=404, detail="Week not found")
    w.status = "confirmed"
    await db.execute(
        select(ShiftAssignment).where(ShiftAssignment.schedule_week_id == week_id)
    )
    from sqlalchemy import update
    await db.execute(
        update(ShiftAssignment).where(ShiftAssignment.schedule_week_id == week_id).values(status="confirmed")
    )
    await db.flush()
    return {"ok": True, "week_id": week_id, "status": "confirmed"}


@router.get("/my", response_model=list[ShiftAssignmentResponse])
async def get_my_schedule(db: Annotated[AsyncSession, Depends(get_db)], emp: Annotated[Employee, Depends(get_current_employee)]):
    result = await db.execute(
        select(ShiftAssignment).where(ShiftAssignment.employee_id == emp.id)
    )
    items = []
    for a in result.scalars().all():
        pos_result = await db.execute(select(Position).where(Position.id == a.position_id))
        pos = pos_result.scalar_one_or_none()
        items.append(ShiftAssignmentResponse(
            id=a.id, employee_id=a.employee_id, employee_name=emp.name,
            position_id=a.position_id, position_name=pos.name if pos else "",
            date=a.date, shift_start=a.shift_start, shift_end=a.shift_end,
            status=a.status, warning_flags=a.warning_flags,
            created_at=a.created_at, updated_at=a.updated_at,
        ))
    return items
