from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.models.adjustment_log import AdjustmentLog
from app.models.employee import Employee
from app.schemas.adjustment_log import AdjustmentLogResponse

router = APIRouter(prefix="/api/adjustment-logs", tags=["Adjustment Logs"])


@router.get("/", response_model=list[AdjustmentLogResponse])
async def list_logs(db: Annotated[AsyncSession, Depends(get_db)], schedule_week_id: int = None):
    query = select(AdjustmentLog).order_by(AdjustmentLog.created_at.desc())
    if schedule_week_id:
        query = query.where(AdjustmentLog.schedule_week_id == schedule_week_id)
    result = await db.execute(query)
    items = []
    for log in result.scalars().all():
        emp_result = await db.execute(select(Employee).where(Employee.id == log.operator_id))
        op = emp_result.scalar_one_or_none()
        items.append(AdjustmentLogResponse(
            id=log.id, schedule_week_id=log.schedule_week_id,
            operator_name=op.name if op else None,
            change_detail=log.change_detail, reason=log.reason,
            created_at=log.created_at,
        ))
    return items
