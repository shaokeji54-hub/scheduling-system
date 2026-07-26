from sqlalchemy import Column, Integer, ForeignKey, Table
from app.database import Base

position_skills = Table(
    "position_skills",
    Base.metadata,
    Column("position_id", Integer, ForeignKey("positions.id"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.id"), primary_key=True),
    comment="岗位要求能力",
)
