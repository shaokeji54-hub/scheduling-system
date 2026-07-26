from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.models.forecast import MonthlyForecast
from app.models.position import Position
from app.schemas.forecast import ForecastCreate, ForecastBatchCreate, ForecastResponse

router = APIRouter(prefix="/api/forecasts", tags=["Forecasts"])


@router.get("/", response_model=list[ForecastResponse])
async def list_forecasts(start_date: str, end_date: str, db: Annotated[AsyncSession, Depends(get_db)]):
    from datetime import date
    s = date.fromisoformat(start_date)
    e = date.fromisoformat(end_date)
    result = await db.execute(
        select(MonthlyForecast).where(MonthlyForecast.date >= s, MonthlyForecast.date <= e)
    )
    items = []
    for f in result.scalars().all():
        pos_result = await db.execute(select(Position).where(Position.id == f.position_id))
        pos = pos_result.scalar_one_or_none()
        items.append(ForecastResponse(
            id=f.id, position_id=f.position_id, date=f.date,
            daily_volume=f.daily_volume,
            position_name=pos.name if pos else None,
            created_at=f.created_at, updated_at=f.updated_at,
        ))
    return items


@router.post("/batch")
async def batch_create(data: ForecastBatchCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    for item in data.items:
        result = await db.execute(
            select(MonthlyForecast).where(
                MonthlyForecast.position_id == item.position_id,
                MonthlyForecast.date == item.date,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.daily_volume = item.daily_volume
        else:
            db.add(MonthlyForecast(position_id=item.position_id, date=item.date, daily_volume=item.daily_volume))
    await db.flush()
    return {"ok": True}
