from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey, UniqueConstraint, func
from app.database import Base


class HourlyRequirement(Base):
    __tablename__ = "hourly_requirements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=False)
    date = Column(Date, nullable=False)
    hour = Column(Integer, nullable=False, comment="小时 0-23")
    required_headcount = Column(Integer, nullable=False, default=0, comment="需到岗人数")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("position_id", "date", "hour", name="uq_position_date_hour"),
    )

    def __repr__(self):
        return f"<HourlyRequirement(pos={self.position_id}, date={self.date}, h={self.hour}, need={self.required_headcount})>"
