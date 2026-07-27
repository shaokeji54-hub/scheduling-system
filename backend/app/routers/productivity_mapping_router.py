from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from datetime import date, timedelta
import csv, io, math

from app.database import get_db
from app.models.productivity_mapping import ProductivityMapping
from app.models.position import Position
from app.models.forecast import MonthlyForecast
from app.models.hourly_requirement import HourlyRequirement
from app.models.position_timeslot import PositionTimeSlot
from app.schemas.productivity_mapping import (
    ProductivityMappingCreate, ProductivityMappingUpdate, ProductivityMappingResponse,
    CalculateStaffingResponse,
)

router = APIRouter(prefix="/api/productivity", tags=["Productivity"])


@router.get("/mappings", response_model=list[ProductivityMappingResponse])
async def list_mappings(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(ProductivityMapping))
    items = []
    for m in result.scalars().all():
        pos_result = await db.execute(select(Position).where(Position.id == m.position_id))
        pos = pos_result.scalar_one_or_none()
        items.append(ProductivityMappingResponse(
            id=m.id, position_id=m.position_id,
            position_name=pos.name if pos else None,
            productivity_value=m.productivity_value, unit=m.unit,
            created_at=m.created_at, updated_at=m.updated_at,
        ))
    return items


@router.post("/mappings", response_model=ProductivityMappingResponse)
async def create_mapping(data: ProductivityMappingCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Position).where(Position.id == data.position_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, detail="Position not found")

    existing = await db.execute(
        select(ProductivityMapping).where(ProductivityMapping.position_id == data.position_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, detail="Mapping already exists for this position, use PUT to update")

    m = ProductivityMapping(position_id=data.position_id, productivity_value=data.productivity_value, unit=data.unit)
    db.add(m)
    await db.flush()
    await db.refresh(m)
    pos_result = await db.execute(select(Position).where(Position.id == m.position_id))
    pos = pos_result.scalar_one_or_none()
    return ProductivityMappingResponse(
        id=m.id, position_id=m.position_id,
        position_name=pos.name if pos else None,
        productivity_value=m.productivity_value, unit=m.unit,
        created_at=m.created_at, updated_at=m.updated_at,
    )


@router.put("/mappings/{mapping_id}", response_model=ProductivityMappingResponse)
async def update_mapping(mapping_id: int, data: ProductivityMappingUpdate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(ProductivityMapping).where(ProductivityMapping.id == mapping_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(404, detail="Mapping not found")
    if data.productivity_value is not None:
        m.productivity_value = data.productivity_value
    if data.unit is not None:
        m.unit = data.unit
    await db.flush()
    await db.refresh(m)
    pos_result = await db.execute(select(Position).where(Position.id == m.position_id))
    pos = pos_result.scalar_one_or_none()
    return ProductivityMappingResponse(
        id=m.id, position_id=m.position_id,
        position_name=pos.name if pos else None,
        productivity_value=m.productivity_value, unit=m.unit,
        created_at=m.created_at, updated_at=m.updated_at,
    )


@router.delete("/mappings/{mapping_id}")
async def delete_mapping(mapping_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(ProductivityMapping).where(ProductivityMapping.id == mapping_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(404, detail="Mapping not found")
    await db.delete(m)
    return {"ok": True}


@router.get("/calculate/{position_id}", response_model=CalculateStaffingResponse)
async def calculate_staffing(position_id: int, date_str: str, db: Annotated[AsyncSession, Depends(get_db)]):
    d = date.fromisoformat(date_str)

    pos_result = await db.execute(select(Position).where(Position.id == position_id))
    pos = pos_result.scalar_one_or_none()
    if not pos:
        raise HTTPException(404, detail="Position not found")

    mapping_result = await db.execute(
        select(ProductivityMapping).where(ProductivityMapping.position_id == position_id)
    )
    mapping = mapping_result.scalar_one_or_none()
    if not mapping:
        return CalculateStaffingResponse(
            position_id=position_id, position_name=pos.name,
            date=date_str, daily_volume=0,
            productivity_value=0, unit="per_hour",
            required_headcount=0, hourly_breakdown=[],
        )

    forecast_result = await db.execute(
        select(MonthlyForecast).where(
            MonthlyForecast.position_id == position_id,
            MonthlyForecast.date == d,
        )
    )
    forecast = forecast_result.scalar_one_or_none()
    daily_volume = forecast.daily_volume if forecast else 0

    if mapping.unit == "per_shift":
        required_headcount = math.ceil(daily_volume / mapping.productivity_value) if mapping.productivity_value > 0 else 0
        hourly_breakdown = None
    else:
        # per_hour: distribute across slot hours evenly
        working_hours = 8
        required_headcount = math.ceil(daily_volume / (mapping.productivity_value * working_hours)) if mapping.productivity_value > 0 else 0
        total_person_hours = required_headcount * working_hours
        # Distribute evenly across 9:00-17:00 (8 slots)
        slot_count = 8
        base = total_person_hours // slot_count
        extra = total_person_hours % slot_count
        hourly_breakdown = [
            {"hour": h, "headcount": base + (1 if (h - 9) < extra else 0)}
            for h in range(9, 18)
        ]

    return CalculateStaffingResponse(
        position_id=position_id, position_name=pos.name,
        date=date_str, daily_volume=daily_volume,
        productivity_value=mapping.productivity_value, unit=mapping.unit,
        required_headcount=math.ceil(required_headcount),
        hourly_breakdown=hourly_breakdown,
    )


@router.get("/calculate-all")
async def calculate_all_staffing(date_str: str, db: Annotated[AsyncSession, Depends(get_db)]):
    """Calculate staffing requirements for all positions with mappings on a given date."""
    d = date.fromisoformat(date_str)
    mappings_result = await db.execute(select(ProductivityMapping))
    mappings = mappings_result.scalars().all()

    results = []
    for m in mappings:
        pos_result = await db.execute(select(Position).where(Position.id == m.position_id))
        pos = pos_result.scalar_one_or_none()
        if not pos:
            continue

        forecast_result = await db.execute(
            select(MonthlyForecast).where(
                MonthlyForecast.position_id == m.position_id,
                MonthlyForecast.date == d,
            )
        )
        forecast = forecast_result.scalar_one_or_none()
        daily_volume = forecast.daily_volume if forecast else 0

        if m.unit == "per_shift":
            required = math.ceil(daily_volume / m.productivity_value) if m.productivity_value > 0 else 0
        else:
            ts_result = await db.execute(
                select(PositionTimeSlot).where(PositionTimeSlot.position_id == m.position_id)
            )
            ts = ts_result.scalar_one_or_none()
            slot_hours = (ts.end_hour - ts.start_hour) if ts else 8
            required = math.ceil(daily_volume / (m.productivity_value * slot_hours)) if m.productivity_value > 0 else 0

        results.append({
            "position_id": m.position_id,
            "position_name": pos.name,
            "daily_volume": daily_volume,
            "productivity_value": m.productivity_value,
            "unit": m.unit,
            "required_headcount": required,
        })

    return {"date": date_str, "items": results}


@router.get("/calculate-range")
async def calculate_range(start_date: str, end_date: str, db: Annotated[AsyncSession, Depends(get_db)]):
    """Calculate staffing requirements for all positions across a date range."""
    sd = date.fromisoformat(start_date)
    ed = date.fromisoformat(end_date)
    mappings_result = await db.execute(select(ProductivityMapping))
    mappings = mappings_result.scalars().all()

    # Get all forecasts in range
    forecasts_result = await db.execute(
        select(MonthlyForecast).where(
            MonthlyForecast.date >= sd,
            MonthlyForecast.date <= ed,
        )
    )
    forecasts = forecasts_result.scalars().all()
    forecast_map = {}
    for f in forecasts:
        forecast_map[(f.position_id, f.date)] = f.daily_volume

    dates = []
    d = sd
    while d <= ed:
        dates.append(d)
        d += timedelta(days=1)

    results_by_date = {}
    for dt in dates:
        dt_str = dt.isoformat()
        items = []
        for m in mappings:
            pos_result = await db.execute(select(Position).where(Position.id == m.position_id))
            pos = pos_result.scalar_one_or_none()
            if not pos:
                continue
            daily_volume = forecast_map.get((m.position_id, dt), 0)
            if m.unit == "per_shift":
                required = math.ceil(daily_volume / m.productivity_value) if m.productivity_value > 0 else 0
            else:
                ts_result = await db.execute(
                    select(PositionTimeSlot).where(PositionTimeSlot.position_id == m.position_id)
                )
                ts = ts_result.scalar_one_or_none()
                slot_hours = (ts.end_hour - ts.start_hour) if ts else 8
                required = math.ceil(daily_volume / (m.productivity_value * slot_hours)) if m.productivity_value > 0 else 0
            items.append({
                "position_id": m.position_id,
                "position_name": pos.name,
                "daily_volume": daily_volume,
                "productivity_value": m.productivity_value,
                "unit": m.unit,
                "required_headcount": required,
            })
        results_by_date[dt_str] = items

    all_positions = []
    for m in mappings:
        pos_result = await db.execute(select(Position).where(Position.id == m.position_id))
        pos = pos_result.scalar_one_or_none()
        if pos:
            all_positions.append({"id": m.position_id, "name": pos.name})
    return {"start_date": start_date, "end_date": end_date, "results_by_date": results_by_date, "all_positions": all_positions}


async def _get_slot_hours(db) -> dict:
    result = await db.execute(select(PositionTimeSlot))
    slots = {}
    for ts in result.scalars().all():
        slots[ts.position_id] = ts.end_hour - ts.start_hour
    return slots


@router.get("/calculate-hourly")
async def calculate_hourly(date_str: str, db: Annotated[AsyncSession, Depends(get_db)]):
    d = date.fromisoformat(date_str)
    mappings_result = await db.execute(select(ProductivityMapping))
    mappings = mappings_result.scalars().all()
    slot_hours_map = await _get_slot_hours(db)

    results = []
    for m in mappings:
        pos_result = await db.execute(select(Position).where(Position.id == m.position_id))
        pos = pos_result.scalar_one_or_none()
        if not pos:
            continue

        forecast_result = await db.execute(
            select(MonthlyForecast).where(
                MonthlyForecast.position_id == m.position_id,
                MonthlyForecast.date == d,
            )
        )
        forecast = forecast_result.scalar_one_or_none()
        daily_volume = forecast.daily_volume if forecast else 0

        ts_result = await db.execute(
            select(PositionTimeSlot).where(PositionTimeSlot.position_id == m.position_id)
        )
        ts = ts_result.scalar_one_or_none()
        start_hour = ts.start_hour if ts else 9
        end_hour = ts.end_hour if ts else 18
        slot_hours = slot_hours_map.get(m.position_id, 8)

        if m.unit == "per_shift":
            required = math.ceil(daily_volume / m.productivity_value) if m.productivity_value > 0 else 0
            hourly_dist = []
            if required > 0:
                for h in range(start_hour, end_hour):
                    hourly_dist.append({"hour": h, "headcount": required})
        else:
            required = math.ceil(daily_volume / (m.productivity_value * slot_hours)) if m.productivity_value > 0 else 0
            # Each person works 8h, distribute evenly across slot_hours
            SHIFT_HOURS = 8
            hourly_dist = []
            if required > 0:
                total_person_hours = required * SHIFT_HOURS
                base = total_person_hours // slot_hours
                extra = total_person_hours % slot_hours
                for h in range(start_hour, end_hour):
                    cnt = base + (1 if (h - start_hour) < extra else 0)
                    hourly_dist.append({"hour": h, "headcount": cnt})

        results.append({
            "position_id": m.position_id,
            "position_name": pos.name,
            "daily_volume": daily_volume,
            "productivity_value": m.productivity_value,
            "unit": m.unit,
            "start_hour": start_hour,
            "end_hour": end_hour,
            "required_headcount": required,
            "hourly_breakdown": hourly_dist,
        })

    return {"date": date_str, "items": results}

