from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import *

# Import all models so Base registers them
from app.models import *


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="部门排班系统",
    description="Department Scheduling System",
    version="1.1.1",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(position_router)
app.include_router(employee_router)
app.include_router(skill_router)
app.include_router(forecast_router)
app.include_router(hourly_req_router)
app.include_router(leave_router)
app.include_router(unavailable_router)
app.include_router(schedule_router)
app.include_router(adjustment_log_router)
app.include_router(productivity_mapping_router)
app.include_router(position_timeslot_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
