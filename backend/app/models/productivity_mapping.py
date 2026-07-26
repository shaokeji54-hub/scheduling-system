from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, UniqueConstraint, func
from app.database import Base


class ProductivityMapping(Base):
    __tablename__ = "productivity_mappings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=False)
    productivity_value = Column(Float, nullable=False, default=1.0, comment="单位时间/班次内一人可处理的业务量")
    unit = Column(String(20), nullable=False, default="per_hour", comment="per_hour | per_shift")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("position_id", name="uq_productivity_position"),
    )

    def __repr__(self):
        return f"<ProductivityMapping(pos={self.position_id}, val={self.productivity_value}, unit={self.unit})>"
