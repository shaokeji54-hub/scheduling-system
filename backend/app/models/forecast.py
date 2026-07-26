from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey, UniqueConstraint, func
from app.database import Base


class MonthlyForecast(Base):
    __tablename__ = "monthly_forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=False)
    date = Column(Date, nullable=False, comment="预测日期")
    daily_volume = Column(Integer, nullable=False, default=0, comment="每日预测量(通话数/工单数)")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("position_id", "date", name="uq_position_date"),
    )

    def __repr__(self):
        return f"<MonthlyForecast(pos={self.position_id}, date={self.date}, vol={self.daily_volume})>"
