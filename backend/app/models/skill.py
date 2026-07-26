from sqlalchemy import Column, Integer, String, DateTime, func
from app.database import Base


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, comment="能力项名称")
    description = Column(String(255), default="", comment="描述")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
