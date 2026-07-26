from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Time, func
from app.database import Base


class UnavailableTime(Base):
    __tablename__ = "unavailable_times"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False, comment="不可用开始时间")
    end_time = Column(Time, nullable=False, comment="不可用结束时间")
    reason = Column(String(255), default="", comment="原因")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<UnavailableTime(emp={self.employee_id}, date={self.date})>"
