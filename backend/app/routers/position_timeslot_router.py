from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.models.position_timeslot import PositionTimeSlot
from app.models.position import Position
from app.schemas.position_timeslot import PositionTimeSlotCreate, PositionTimeSlotUpdate, PositionTimeSlotResponse

router = APIRouter(prefix="/api/position-timeslots", tags=["Position Time Slots"])


@router.get("/", response_model=list[PositionTimeSlotResponse])
async def list_timeslots(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(PositionTimeSlot))
    items = []
    for ts in result.scalars().all():
        pos_result = await db.execute(select(Position).where(Position.id == ts.position_id))
        pos = pos_result.scalar_one_or_none()
        items.append(PositionTimeSlotResponse(
            id=ts.id, position_id=ts.position_id,
            position_name=pos.name if pos else None,
            start_hour=ts.start_hour, end_hour=ts.end_hour,
            created_at=ts.created_at, updated_at=ts.updated_at,
        ))
    return items


@router.post("/", response_model=PositionTimeSlotResponse)
async def create_timeslot(data: PositionTimeSlotCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    pos_result = await db.execute(select(Position).where(Position.id == data.position_id))
    if not pos_result.scalar_one_or_none():
        raise HTTPException(404, detail="Position not found")

    existing = await db.execute(
        select(PositionTimeSlot).where(PositionTimeSlot.position_id == data.position_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, detail="Time slot already exists for this position")

    ts = PositionTimeSlot(position_id=data.position_id, start_hour=data.start_hour, end_hour=data.end_hour)
    db.add(ts)
    await db.flush()
    await db.refresh(ts)
    pos_result = await db.execute(select(Position).where(Position.id == ts.position_id))
    pos = pos_result.scalar_one_or_none()
    return PositionTimeSlotResponse(
        id=ts.id, position_id=ts.position_id, position_name=pos.name if pos else None,
        start_hour=ts.start_hour, end_hour=ts.end_hour,
        created_at=ts.created_at, updated_at=ts.updated_at,
    )


@router.put("/{timeslot_id}", response_model=PositionTimeSlotResponse)
async def update_timeslot(timeslot_id: int, data: PositionTimeSlotUpdate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(PositionTimeSlot).where(PositionTimeSlot.id == timeslot_id))
    ts = result.scalar_one_or_none()
    if not ts:
        raise HTTPException(404, detail="Time slot not found")
    if data.start_hour is not None:
        ts.start_hour = data.start_hour
    if data.end_hour is not None:
        ts.end_hour = data.end_hour
    await db.flush()
    await db.refresh(ts)
    pos_result = await db.execute(select(Position).where(Position.id == ts.position_id))
    pos = pos_result.scalar_one_or_none()
    return PositionTimeSlotResponse(
        id=ts.id, position_id=ts.position_id, position_name=pos.name if pos else None,
        start_hour=ts.start_hour, end_hour=ts.end_hour,
        created_at=ts.created_at, updated_at=ts.updated_at,
    )


@router.delete("/{timeslot_id}")
async def delete_timeslot(timeslot_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(PositionTimeSlot).where(PositionTimeSlot.id == timeslot_id))
    ts = result.scalar_one_or_none()
    if not ts:
        raise HTTPException(404, detail="Time slot not found")
    await db.delete(ts)
    return {"ok": True}
