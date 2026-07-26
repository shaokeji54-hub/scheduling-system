from app.routers.auth_router import router as auth_router
from app.routers.position_router import router as position_router
from app.routers.employee_router import router as employee_router
from app.routers.forecast_router import router as forecast_router
from app.routers.hourly_req_router import router as hourly_req_router
from app.routers.leave_router import router as leave_router
from app.routers.unavailable_router import router as unavailable_router
from app.routers.schedule_router import router as schedule_router
from app.routers.skill_router import router as skill_router
from app.routers.adjustment_log_router import router as adjustment_log_router

__all__ = [
    "auth_router",
    "position_router",
    "employee_router",
    "forecast_router",
    "hourly_req_router",
    "leave_router",
    "unavailable_router",
    "schedule_router",
    "skill_router",
    "adjustment_log_router",
]

from app.routers.skill_router import router as skill_router
