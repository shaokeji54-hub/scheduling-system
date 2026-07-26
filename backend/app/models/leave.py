from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text, func
from app.database import Base


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    leave_date = Column(Date, nullable=False, comment="休假日期")
    leave_type = Column(String(20), nullable=False, default="annual", comment="annual | sick | personal | comp")
    status = Column(String(20), nullable=False, default="pending", comment="pending | approved | rejected")
    rejection_reason = Column(Text, nullable=True, comment="拒绝原因")
    submit_feedback = Column(Text, nullable=True, comment="提交时预检反馈")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<LeaveRequest(emp={self.employee_id}, date={self.leave_date}, status={self.status})>"
