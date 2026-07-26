from datetime import date, time, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.employee import Employee
from app.models.employee import Employee


from app.models.schedule import ShiftAssignment, ScheduleWeek
from app.models.hourly_requirement import HourlyRequirement
from app.models.leave import LeaveRequest
from app.models.unavailable_time import UnavailableTime
from app.models.adjustment_log import AdjustmentLog
from app.scheduler.engine import SchedulingEngine, EmpSlot, Requirement, Unavailable, Leave, ScheduleResult


class SchedulerService:

    @staticmethod
    async def prepare_data(db: AsyncSession, week_start: date) -> dict:
        """Load all data needed for scheduling for a week."""
        employees_result = await db.execute(select(Employee).where(Employee.is_active == 1))
        employees = employees_result.scalars().all()

        emp_slots = []
        for emp in employees:
            skill_ids = [s.id for s in emp.skills]
            emp_slots.append(EmpSlot(
                employee_id=emp.id,
                name=emp.name,
                primary_position_id=emp.primary_position_id,
                skill_ids=skill_ids,
                weekly_hours=emp.weekly_hours,
                monthly_overtime=emp.monthly_overtime,
                comp_time_balance=emp.comp_time_balance,
            ))

        from datetime import timedelta
        end_date = week_start + timedelta(days=7)
        reqs_result = await db.execute(
            select(HourlyRequirement).where(
                HourlyRequirement.date >= week_start,
                HourlyRequirement.date < end_date,
            )
        )
        reqs = reqs_result.scalars().all()
        requirements = [
            Requirement(position_id=r.position_id, date=r.date, hour=r.hour, needed=r.required_headcount)
            for r in reqs
        ]

        # Leaves for the week
        leaves_result = await db.execute(
            select(LeaveRequest).where(
                LeaveRequest.leave_date >= week_start,
                LeaveRequest.leave_date < end_date,
                LeaveRequest.status.in_(["pending", "approved"]),
            )
        )
        leaves = [
            Leave(employee_id=lv.employee_id, date=lv.leave_date)
            for lv in leaves_result.scalars().all()
        ]

        # Unavailable times for the week
        unavail_result = await db.execute(
            select(UnavailableTime).where(
                UnavailableTime.date >= week_start,
                UnavailableTime.date < end_date,
            )
        )
        unavailable = []
        for u in unavail_result.scalars().all():
            unavailable.append(Unavailable(
                employee_id=u.employee_id,
                date=u.date,
                start_hour=u.start_time.hour,
                end_hour=u.end_time.hour,
            ))

        # Existing monthly overtime for current month
        existing_ot = {}
        for emp in employees:
            existing_ot[emp.id] = emp.monthly_overtime

        return dict(
            emp_slots=emp_slots,
            requirements=requirements,
            unavailable=unavailable,
            leaves=leaves,
            week_start=week_start,
            existing_ot=existing_ot,
        )

    @staticmethod
    async def run_engine(db: AsyncSession, week_start: date) -> ScheduleResult:
        data = await SchedulerService.prepare_data(db, week_start)

        engine = SchedulingEngine(
            employees=data["emp_slots"],
            requirements=data["requirements"],
            unavailable=data["unavailable"],
            leaves=data["leaves"],
            week_start=week_start,
            existing_monthly_overtime=data["existing_ot"],
        )
        result = engine.generate()

        if result.success:
            # Save the schedule
            schedule_week = ScheduleWeek(week_start=week_start, status="draft")
            db.add(schedule_week)
            await db.flush()

            for a in result.assignments:
                shift = ShiftAssignment(
                    employee_id=a.employee_id,
                    position_id=a.position_id,
                    date=a.date,
                    shift_start=a.shift_start,
                    shift_end=a.shift_end,
                    status="preliminary",
                    schedule_week_id=schedule_week.id,
                    warning_flags=",".join(a.warning_flags),
                )
                db.add(shift)

        return result
