from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.models.unavailable_time import UnavailableTime
from app.models.employee import Employee
from app.schemas.unavailable_time import UnavailableTimeCreate, UnavailableTimeResponse
from app.services.auth import get_current_employee

router = APIRouter(prefix="/api/unavailable-times", tags=["Unavailable Times"])


@router.get("/", response_model=list[UnavailableTimeResponse])
async def list_unavailable(db: Annotated[AsyncSession, Depends(get_db)], emp: Annotated[Employee, Depends(get_current_employee)]):
    query = select(UnavailableTime)
    if emp.role == "employee":
        query = query.where(UnavailableTime.employee_id == emp.id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=UnavailableTimeResponse)
async def create_unavailable(data: UnavailableTimeCreate, db: Annotated[AsyncSession, Depends(get_db)], emp: Annotated[Employee, Depends(get_current_employee)]):
    u = UnavailableTime(
        employee_id=emp.id, date=data.date,
        start_time=data.start_time, end_time=data.end_time,
        reason=data.reason,
    )
    db.add(u)
    await db.flush()
    await db.refresh(u)
    return u
