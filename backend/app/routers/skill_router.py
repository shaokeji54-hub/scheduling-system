from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Annotated

from app.database import get_db
from app.models.skill import Skill
from app.models.position import Position
from app.models.employee import Employee
from app.schemas.skill import SkillCreate, SkillResponse, PositionSkillsUpdate, EmployeeSkillsUpdate

router = APIRouter(prefix="/api/skills", tags=["Skills"])


@router.get("/", response_model=list[SkillResponse])
async def list_skills(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Skill).order_by(Skill.name))
    return result.scalars().all()


@router.post("/", response_model=SkillResponse)
async def create_skill(data: SkillCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    skill = Skill(name=data.name, description=data.description)
    db.add(skill)
    await db.flush()
    await db.refresh(skill)
    return skill


@router.put("/{skill_id}", response_model=SkillResponse)
async def update_skill(skill_id: int, data: SkillCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404)
    skill.name = data.name
    skill.description = data.description
    await db.flush()
    await db.refresh(skill)
    return skill


@router.delete("/{skill_id}")
async def delete_skill(skill_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404)
    await db.delete(skill)
    await db.flush()
    return {"ok": True}


@router.get("/positions/{position_id}")
async def get_position_skills(position_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Position).options(selectinload(Position.required_skills)).where(Position.id == position_id)
    )
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404)
    return {"id": pos.id, "name": pos.name, "skill_ids": [s.id for s in pos.required_skills]}


@router.put("/positions/{position_id}")
async def update_position_skills(position_id: int, data: PositionSkillsUpdate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Position).options(selectinload(Position.required_skills)).where(Position.id == position_id))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404)
    result = await db.execute(select(Skill).where(Skill.id.in_(data.skill_ids)))
    skills = result.scalars().all()
    pos.required_skills = list(skills)
    await db.flush()
    return {"ok": True, "skill_ids": data.skill_ids}


@router.get("/employees/{employee_id}")
async def get_employee_skills(employee_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Employee).options(selectinload(Employee.skills)).where(Employee.id == employee_id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404)
    return {"employee_id": emp.id, "skill_ids": [s.id for s in emp.skills]}


@router.put("/employees/{employee_id}")
async def update_employee_skills(employee_id: int, data: EmployeeSkillsUpdate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Employee).options(selectinload(Employee.skills)).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404)
    result = await db.execute(select(Skill).where(Skill.id.in_(data.skill_ids)))
    skills = result.scalars().all()
    emp.skills = list(skills)
    await db.flush()
    return {"ok": True, "skill_ids": data.skill_ids}
