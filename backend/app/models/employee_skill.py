from sqlalchemy import Column, Integer, ForeignKey, Table
from app.database import Base

employee_skills = Table(
    "employee_skills",
    Base.metadata,
    Column("employee_id", Integer, ForeignKey("employees.id"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.id"), primary_key=True),
    comment="员工具备能力",
)
