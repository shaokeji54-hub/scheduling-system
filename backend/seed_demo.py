"""Seed demo data with higher volume for 18 employees."""

import asyncio, sys
sys.path.insert(0, r"D:\codex\scheduling-system\backend")
from datetime import date, timedelta
from app.database import async_session
from sqlalchemy import select
from app.models import *
from app.models.productivity_mapping import ProductivityMapping
from app.models.position_timeslot import PositionTimeSlot
from app.models.forecast import MonthlyForecast
from app.models.hourly_requirement import HourlyRequirement

async def seed_demo():
    async with async_session() as db:
        pos_result = await db.execute(select(Position))
        positions = {p.name: p for p in pos_result.scalars().all()}
        if not positions:
            print("No positions found. Run seed.py first.")
            return

        mapping_data = {
            "投诉组": (5, "per_hour"),
            "咨询组": (8, "per_hour"),
            "销售组": (3, "per_hour"),
        }
        for pname, (val, unit) in mapping_data.items():
            if pname not in positions: continue
            pid = positions[pname].id
            existing = await db.execute(
                select(ProductivityMapping).where(ProductivityMapping.position_id == pid)
            )
            if not existing.scalar_one_or_none():
                db.add(ProductivityMapping(position_id=pid, productivity_value=val, unit=unit))

        for pname in positions:
            pid = positions[pname].id
            existing = await db.execute(
                select(PositionTimeSlot).where(PositionTimeSlot.position_id == pid)
            )
            if not existing.scalar_one_or_none():
                db.add(PositionTimeSlot(position_id=pid, start_hour=9, end_hour=18))

        # Higher daily volumes for 18 employees
        today = date.today()
        forecast_data = {
            "投诉组": (200, 180, 220, 190, 210, 150, 120, 200, 185, 215, 195, 205, 160, 130),
            "咨询组": (320, 280, 360, 300, 340, 220, 180, 310, 290, 350, 305, 330, 230, 190),
            "销售组": (130, 110, 150, 120, 140, 90, 70, 125, 115, 145, 128, 135, 95, 75),
        }
        for pname, volumes in forecast_data.items():
            if pname not in positions: continue
            pid = positions[pname].id
            for i, vol in enumerate(volumes[:14]):
                d = today + timedelta(days=i)
                existing = await db.execute(
                    select(MonthlyForecast).where(
                        MonthlyForecast.position_id == pid,
                        MonthlyForecast.date == d,
                    )
                )
                if not existing.scalar_one_or_none():
                    db.add(MonthlyForecast(position_id=pid, date=d, daily_volume=vol))

        for pname, volumes in forecast_data.items():
            if pname not in positions: continue
            pid = positions[pname].id
            mapping = (await db.execute(
                select(ProductivityMapping).where(ProductivityMapping.position_id == pid)
            )).scalar_one_or_none()
            ts = (await db.execute(
                select(PositionTimeSlot).where(PositionTimeSlot.position_id == pid)
            )).scalar_one_or_none()
            if not mapping or not ts:
                continue
            slot_hours = ts.end_hour - ts.start_hour
            for i, vol in enumerate(volumes[:14]):
                d = today + timedelta(days=i)
                if mapping.unit == "per_hour":
                    required = (vol + mapping.productivity_value * slot_hours - 1) // (mapping.productivity_value * slot_hours)
                else:
                    required = (vol + mapping.productivity_value - 1) // mapping.productivity_value
                for h in range(ts.start_hour, ts.end_hour):
                    existing = await db.execute(
                        select(HourlyRequirement).where(
                            HourlyRequirement.position_id == pid,
                            HourlyRequirement.date == d,
                            HourlyRequirement.hour == h,
                        )
                    )
                    if not existing.scalar_one_or_none():
                        db.add(HourlyRequirement(
                            position_id=pid, date=d, hour=h,
                            required_headcount=required,
                        ))
        await db.commit()
        print("Demo data seeded successfully!")
        pos_result2 = await db.execute(select(Position))
        for p in pos_result2.scalars().all():
            vol = forecast_data.get(p.name, [0])[0]
            print(f"  {p.name}: {vol}/day volume")

asyncio.run(seed_demo())
