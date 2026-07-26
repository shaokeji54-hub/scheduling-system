from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.models.hourly_requirement import HourlyRequirement
from app.models.position import Position
from app.schemas.hourly_requirement import HourlyReqCreate, HourlyReqBatchCreate, HourlyReqResponse

router = APIRouter(prefix="/api/hourly-requirements", tags=["Hourly Requirements"])


@router.get("/", response_model=list[HourlyReqResponse])
async def list_reqs(start_date: str, end_date: str, db: Annotated[AsyncSession, Depends(get_db)], position_id: int = None):
    from datetime import date
    s = date.fromisoformat(start_date)
    e = date.fromisoformat(end_date)
    query = select(HourlyRequirement).where(HourlyRequirement.date >= s, HourlyRequirement.date <= e)
    if position_id:
        query = query.where(HourlyRequirement.position_id == position_id)
    result = await db.execute(query)
    items = []
    for r in result.scalars().all():
        pos_result = await db.execute(select(Position).where(Position.id == r.position_id))
        pos = pos_result.scalar_one_or_none()
        items.append(HourlyReqResponse(
            id=r.id, position_id=r.position_id, date=r.date, hour=r.hour,
            required_headcount=r.required_headcount,
            position_name=pos.name if pos else None,
            created_at=r.created_at, updated_at=r.updated_at,
        ))
    return items


@router.post("/batch")
async def batch_create(data: HourlyReqBatchCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    for item in data.items:
        result = await db.execute(
            select(HourlyRequirement).where(
                HourlyRequirement.position_id == item.position_id,
                HourlyRequirement.date == item.date,
                HourlyRequirement.hour == item.hour,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.required_headcount = item.required_headcount
        else:
            db.add(HourlyRequirement(
                position_id=item.position_id, date=item.date,
                hour=item.hour, required_headcount=item.required_headcount,
            ))
    await db.flush()
    return {"ok": True}
