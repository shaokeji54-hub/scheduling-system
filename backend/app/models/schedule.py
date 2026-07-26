from sqlalchemy import Column, Integer, String, Date, Time, DateTime, ForeignKey, func
from app.database import Base


class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=False)
    date = Column(Date, nullable=False)
    shift_start = Column(Time, nullable=False)
    shift_end = Column(Time, nullable=False)
    status = Column(String(20), nullable=False, default="preliminary", comment="preliminary | confirmed | adjusted")
    schedule_week_id = Column(Integer, ForeignKey("schedule_weeks.id"), nullable=True)
    warning_flags = Column(String(255), default="", comment="建议规则标注, comma separated")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<ShiftAssignment(emp={self.employee_id}, date={self.date}, {self.shift_start}-{self.shift_end})>"


class ScheduleWeek(Base):
    __tablename__ = "schedule_weeks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    week_start = Column(Date, nullable=False, unique=True, comment="周起始日(周一)")
    status = Column(String(20), nullable=False, default="draft", comment="draft | confirmed | preliminary")
    created_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<ScheduleWeek(start={self.week_start}, status={self.status})>"
