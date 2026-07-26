from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.models.employee import Employee
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Employee).where(Employee.email == req.email))
    emp = result.scalar_one_or_none()
    if not emp or not AuthService.verify_password(req.password, emp.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not emp.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")
    token = AuthService.create_access_token(emp.id, emp.role)
    return TokenResponse(
        access_token=token,
        employee_id=emp.id,
        role=emp.role,
        name=emp.name,
    )
