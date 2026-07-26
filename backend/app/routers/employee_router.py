from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.models.employee import Employee
from app.models.position import Position
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeSkillUpdate
from app.services.auth import AuthService

router = APIRouter(prefix="/api/employees", tags=["Employees"])


@router.get("/", response_model=list[EmployeeResponse])
async def list_employees(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Employee).options(selectinload(Employee.primary_position), selectinload(Employee.skills)).order_by(Employee.name))
    emps = result.scalars().all()
    resp = []
    for emp in emps:
        skill_ids = [s.id for s in emp.skills]
        resp.append(EmployeeResponse(
            id=emp.id, name=emp.name, email=emp.email, role=emp.role,
            primary_position_id=emp.primary_position_id,
            is_active=emp.is_active, comp_time_balance=emp.comp_time_balance,
            weekly_hours=emp.weekly_hours, monthly_overtime=emp.monthly_overtime,
            skill_ids=skill_ids,
            primary_position_name=emp.primary_position.name if emp.primary_position else None,
            created_at=emp.created_at, updated_at=emp.updated_at,
        ))
    return resp


@router.post("/", response_model=EmployeeResponse)
async def create_employee(data: EmployeeCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    hashed = AuthService.hash_password(data.password)
    emp = Employee(
        name=data.name, email=data.email, role=data.role,
        primary_position_id=data.primary_position_id,
        hashed_password=hashed,
    )
    db.add(emp)
    await db.flush()
    await db.refresh(emp, ["skills"])
    await db.refresh(emp)
    skill_ids = [s.id for s in emp.skills]
    return EmployeeResponse(
        id=emp.id, name=emp.name, email=emp.email, role=emp.role,
        primary_position_id=emp.primary_position_id,
        is_active=emp.is_active, comp_time_balance=emp.comp_time_balance,
        weekly_hours=emp.weekly_hours, monthly_overtime=emp.monthly_overtime,
        skill_ids=skill_ids,
        primary_position_name=emp.primary_position.name if emp.primary_position else None,
        created_at=emp.created_at, updated_at=emp.updated_at,
    )


@router.put("/{emp_id}", response_model=EmployeeResponse)
async def update_employee(emp_id: int, data: EmployeeUpdate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Employee).where(Employee.id == emp_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if data.name is not None:
        emp.name = data.name
    if data.email is not None:
        emp.email = data.email
    if data.role is not None:
        emp.role = data.role
    if data.primary_position_id is not None:
        emp.primary_position_id = data.primary_position_id
    if data.is_active is not None:
        emp.is_active = data.is_active
    await db.flush()
    await db.refresh(emp, ["skills"])
    await db.refresh(emp)
    skill_ids = [s.id for s in emp.skills]
    return EmployeeResponse(
        id=emp.id, name=emp.name, email=emp.email, role=emp.role,
        primary_position_id=emp.primary_position_id,
        is_active=emp.is_active, comp_time_balance=emp.comp_time_balance,
        weekly_hours=emp.weekly_hours, monthly_overtime=emp.monthly_overtime,
        skill_ids=skill_ids,
        primary_position_name=emp.primary_position.name if emp.primary_position else None,
        created_at=emp.created_at, updated_at=emp.updated_at,
    )


@router.put("/{emp_id}/skills")
async def update_skills(emp_id: int, data: EmployeeSkillUpdate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Employee).where(Employee.id == emp_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    result = await db.execute(select(Position).where(Position.id.in_(data.skill_ids)))
    positions = result.scalars().all()
    emp.skills = list(positions)
    await db.flush()
    return {"ok": True, "skill_ids": data.skill_ids}
