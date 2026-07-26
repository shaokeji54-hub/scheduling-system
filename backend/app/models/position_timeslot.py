from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, func
from app.database import Base


class PositionTimeSlot(Base):
    __tablename__ = "position_timeslots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=False)
    start_hour = Column(Integer, nullable=False, default=9, comment="班次起始小时 0-23")
    end_hour = Column(Integer, nullable=False, default=18, comment="班次结束小时 1-24")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("position_id", name="uq_timeslot_position"),
    )

    def __repr__(self):
        return f"<PositionTimeSlot(pos={self.position_id}, {self.start_hour}:00-{self.end_hour}:00)>"
