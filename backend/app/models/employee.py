from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="employee")
    primary_position_id = Column(Integer, ForeignKey("positions.id"), nullable=False)
    comp_time_balance = Column(Float, default=0.0)
    weekly_hours = Column(Float, default=0.0)
    monthly_overtime = Column(Float, default=0.0)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    primary_position = relationship("Position", foreign_keys=[primary_position_id])
    skills = relationship("Skill", secondary="employee_skills")

    def __repr__(self):
        return f"<Employee(id={self.id}, name='{self.name}')>"
