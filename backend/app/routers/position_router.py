from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.models.position import Position
from app.schemas.position import PositionCreate, PositionUpdate, PositionResponse

router = APIRouter(prefix="/api/positions", tags=["Positions"])


@router.get("/", response_model=list[PositionResponse])
async def list_positions(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Position).order_by(Position.name))
    return result.scalars().all()


@router.post("/", response_model=PositionResponse)
async def create_position(data: PositionCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    pos = Position(name=data.name, description=data.description)
    db.add(pos)
    await db.flush()
    await db.refresh(pos)
    return pos


@router.put("/{pos_id}", response_model=PositionResponse)
async def update_position(pos_id: int, data: PositionUpdate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Position).where(Position.id == pos_id))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    if data.name is not None:
        pos.name = data.name
    if data.description is not None:
        pos.description = data.description
    await db.flush()
    await db.refresh(pos)
    return pos


@router.delete("/{pos_id}")
async def delete_position(pos_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Position).where(Position.id == pos_id))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    await db.delete(pos)
    await db.flush()
    return {"ok": True}
