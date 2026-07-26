from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, func
from app.database import Base


class AdjustmentLog(Base):
    __tablename__ = "adjustment_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_week_id = Column(Integer, ForeignKey("schedule_weeks.id"), nullable=True)
    assignment_id = Column(Integer, ForeignKey("shift_assignments.id"), nullable=True)
    operator_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    change_detail = Column(Text, nullable=False, comment="变更详情(JSON)")
    reason = Column(String(255), default="", comment="变更原因")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<AdjustmentLog(id={self.id}, operator={self.operator_id})>"
