from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.models.leave import LeaveRequest
from app.models.employee import Employee
from app.models.adjustment_log import AdjustmentLog
from app.schemas.leave import LeaveRequestCreate, LeaveRequestResponse, LeaveRequestReview
from app.services.auth import get_current_employee

router = APIRouter(prefix="/api/leaves", tags=["Leaves"])


@router.get("/", response_model=list[LeaveRequestResponse])
async def list_leaves(db: Annotated[AsyncSession, Depends(get_db)], emp: Annotated[Employee, Depends(get_current_employee)]):
    query = select(LeaveRequest)
    if emp.role == "employee":
        query = query.where(LeaveRequest.employee_id == emp.id)
    result = await db.execute(query)
    items = []
    for lv in result.scalars().all():
        emp_result = await db.execute(select(Employee).where(Employee.id == lv.employee_id))
        e = emp_result.scalar_one_or_none()
        creator_name = None
        if lv.creator_id:
            cr_result = await db.execute(select(Employee).where(Employee.id == lv.creator_id))
            cr = cr_result.scalar_one_or_none()
            creator_name = cr.name if cr else None
        items.append(LeaveRequestResponse(
            id=lv.id, employee_id=lv.employee_id, employee_name=e.name if e else None,
            leave_date=lv.leave_date, leave_type=lv.leave_type, status=lv.status,
            rejection_reason=lv.rejection_reason, submit_feedback=lv.submit_feedback,
            creator_type=lv.creator_type,
            creator_name=creator_name,
            created_at=lv.created_at, updated_at=lv.updated_at,
        ))
    return items


@router.post("/", response_model=LeaveRequestResponse)
async def create_leave(data: LeaveRequestCreate, db: Annotated[AsyncSession, Depends(get_db)], emp: Annotated[Employee, Depends(get_current_employee)]):
    target_emp_id = emp.id
    creator_type = "employee"

    if emp.role == "scheduler" and data.employee_id is not None:
        target_emp_id = data.employee_id
        creator_type = "scheduler"

    target_result = await db.execute(select(Employee).where(Employee.id == target_emp_id))
    target_emp = target_result.scalar_one_or_none()
    if not target_emp:
        raise HTTPException(404, detail="Target employee not found")

    lv = LeaveRequest(
        employee_id=target_emp_id, leave_date=data.leave_date, leave_type=data.leave_type,
        status="pending", creator_type=creator_type, creator_id=emp.id if creator_type == "scheduler" else None,
    )
    # Pre-check feasibility (simplified - count employees in same position)
    from app.models.hourly_requirement import HourlyRequirement
    result = await db.execute(
        select(HourlyRequirement).where(
            HourlyRequirement.date == data.leave_date,
        )
    )
    reqs = result.scalars().all()
    max_demand = max((r.required_headcount for r in reqs), default=0)
    same_pos = await db.execute(
        select(Employee).where(
            Employee.primary_position_id == target_emp.primary_position_id,
            Employee.is_active == 1,
        )
    )
    same_pos_emps = same_pos.scalars().all()
    in_house = len(same_pos_emps)
    if max_demand > 0 and in_house <= max_demand:
        lv.submit_feedback = f"预检警告：{data.leave_date} 你所在岗位最低需 {max_demand} 人到岗，当前仅 {in_house} 人。该日休假可能无法安排。"
    db.add(lv)
    await db.flush()
    await db.refresh(lv)

    # Log if scheduler created this leave
    if creator_type == "scheduler":
        log = AdjustmentLog(
            operator_id=emp.id,
            change_detail=(
                f"排班员代填休假: 员工 #{target_emp_id}({target_emp.name}) "
                f"{data.leave_date} {data.leave_type}型"
            ),
            reason="排班员代员工填写休假申请",
        )
        db.add(log)
        await db.flush()

    emp_result = await db.execute(select(Employee).where(Employee.id == lv.employee_id))
    e = emp_result.scalar_one_or_none()
    creator_name = emp.name if creator_type == "scheduler" else None
    return LeaveRequestResponse(
        id=lv.id, employee_id=lv.employee_id, employee_name=e.name if e else None,
        leave_date=lv.leave_date, leave_type=lv.leave_type, status=lv.status,
        rejection_reason=lv.rejection_reason, submit_feedback=lv.submit_feedback,
        creator_type=creator_type, creator_name=creator_name,
        created_at=lv.created_at, updated_at=lv.updated_at,
    )


@router.put("/{leave_id}/review")
async def review_leave(leave_id: int, data: LeaveRequestReview, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    lv = result.scalar_one_or_none()
    if not lv:
        raise HTTPException(status_code=404, detail="Leave request not found")
    lv.status = data.status
    lv.rejection_reason = data.rejection_reason
    await db.flush()
    return {"ok": True}
