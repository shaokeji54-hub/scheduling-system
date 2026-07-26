"""
Scheduling engine with hard-constraint enforcement and advisory rule warnings.
"""
from dataclasses import dataclass, field
from datetime import date, time, timedelta, datetime
from collections import defaultdict


@dataclass
class EmpSlot:
    employee_id: int
    name: str
    primary_position_id: int
    skill_ids: list[int]
    weekly_hours: float
    monthly_overtime: float
    comp_time_balance: float


@dataclass
class Requirement:
    position_id: int
    date: date
    hour: int
    needed: int


@dataclass
class Unavailable:
    employee_id: int
    date: date
    start_hour: int
    end_hour: int


@dataclass
class Leave:
    employee_id: int
    date: date


@dataclass
class Assignment:
    employee_id: int
    position_id: int
    date: date
    shift_start: time
    shift_end: time
    warning_flags: list[str] = field(default_factory=list)


@dataclass
class ScheduleResult:
    success: bool
    message: str
    assignments: list[Assignment] = field(default_factory=list)
    coverage_gaps: list[dict] = field(default_factory=list)
    warnings: list[dict] = field(default_factory=list)
    infeasible_reasons: list[str] = field(default_factory=list)


class SchedulingEngine:
    MAX_DAILY_HOURS = 11
    MAX_CONSECUTIVE_DAYS = 6
    MAX_WEEKLY_HOURS = 40
    MAX_MONTHLY_OVERTIME_HARD = 36
    MAX_MONTHLY_OVERTIME_ADVISORY = 30
    MIN_SHIFT_INTERVAL_HOURS = 11
    DEFAULT_SHIFT_LENGTH = 8

    def __init__(self, employees, requirements, unavailable, leaves, week_start, existing_monthly_overtime=None):
        self.employees = {e.employee_id: e for e in employees}
        self.requirements = requirements
        self.week_start = week_start
        self.existing_monthly_overtime = existing_monthly_overtime or {}
        self.unavailable_by_emp = defaultdict(list)
        for u in unavailable:
            self.unavailable_by_emp[u.employee_id].append(u)
        self.leaves_by_emp = defaultdict(set)
        for lv in leaves:
            self.leaves_by_emp[lv.employee_id].add(lv.date)
        self.assigned_hours = defaultdict(lambda: defaultdict(float))
        self.work_dates_by_emp = defaultdict(set)
        self.weekly_hours = defaultdict(float)
        self.last_shift_end = defaultdict(dict)

    def _hours_between(self, start, end):
        if end >= start:
            return (end.hour - start.hour) + (end.minute - start.minute) / 60.0
        return (24 - start.hour) + end.hour + (end.minute - start.minute) / 60.0

    def _is_available(self, eid, d, hour):
        if d in self.leaves_by_emp.get(eid, set()):
            return False
        for u in self.unavailable_by_emp.get(eid, []):
            if u.date == d and u.start_hour <= hour < u.end_hour:
                return False
        return True

    def _consecutive_count(self, eid, d):
        dates = self.work_dates_by_emp[eid] | {d}
        sorted_dates = sorted(dates)
        idx = sorted_dates.index(d)
        cnt = 1
        for i in range(idx - 1, -1, -1):
            if (sorted_dates[i + 1] - sorted_dates[i]).days == 1:
                cnt += 1
            else:
                break
        for i in range(idx + 1, len(sorted_dates)):
            if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
                cnt += 1
            else:
                break
        return cnt

    def _pre_check_feasibility(self):
        reasons = []
        covered_by_pos = defaultdict(set)
        for emp in self.employees.values():
            covered_by_pos[emp.primary_position_id].add(emp.employee_id)
            for sid in emp.skill_ids:
                covered_by_pos[sid].add(emp.employee_id)
        for r in self.requirements:
            pool = covered_by_pos.get(r.position_id, set())
            available = sum(1 for eid in pool if self._is_available(eid, r.date, r.hour))
            if available < r.needed:
                reasons.append(str(r.date) + ' pos#' + str(r.position_id) + ' h' + str(r.hour) + ': need ' + str(r.needed) + ', only ' + str(available))
        return reasons

    def generate(self):
        infeasible = self._pre_check_feasibility()
        if infeasible:
            return ScheduleResult(success=False, message='Infeasible requirements', infeasible_reasons=infeasible)

        demand = defaultdict(int)
        for r in self.requirements:
            demand[(r.position_id, r.date, r.hour)] = r.needed

        coverage = defaultdict(int)
        assignments = []
        warnings = []
        sorted_slots = sorted(demand.keys(), key=lambda s: (-demand[s], s[1], s[2]))

        for slot_pos, slot_date, slot_hour in sorted_slots:
            needed = demand[(slot_pos, slot_date, slot_hour)] - coverage[(slot_pos, slot_date, slot_hour)]
            if needed <= 0:
                continue
            candidates = []
            for emp in self.employees.values():
                eid = emp.employee_id
                if emp.primary_position_id != slot_pos and slot_pos not in emp.skill_ids:
                    continue
                if not self._is_available(eid, slot_date, slot_hour):
                    continue
                s_start = time(hour=slot_hour, minute=0)
                s_end_hour = min(slot_hour + self.DEFAULT_SHIFT_LENGTH, 24)
                s_end = time(hour=s_end_hour, minute=0)
                s_hours = self._hours_between(s_start, s_end)
                if self.assigned_hours[eid][slot_date] + s_hours > self.MAX_DAILY_HOURS:
                    continue
                if self._consecutive_count(eid, slot_date) > self.MAX_CONSECUTIVE_DAYS:
                    continue
                new_weekly = self.weekly_hours[eid] + s_hours
                new_ot = max(0, new_weekly - self.MAX_WEEKLY_HOURS) + self.existing_monthly_overtime.get(eid, 0)
                if new_ot > self.MAX_MONTHLY_OVERTIME_HARD:
                    continue
                is_primary = 0 if emp.primary_position_id == slot_pos else 1
                candidates.append((eid, s_start, s_end, s_hours, is_primary, self.weekly_hours[eid]))

            candidates.sort(key=lambda c: (c[4], c[5]))
            assigned_count = 0
            for eid, s_start, s_end, s_hours, _, _ in candidates:
                if assigned_count >= needed:
                    break
                emp = self.employees[eid]
                new_weekly = self.weekly_hours[eid] + s_hours
                new_ot = max(0, new_weekly - self.MAX_WEEKLY_HOURS) + self.existing_monthly_overtime.get(eid, 0)
                if new_ot > self.MAX_MONTHLY_OVERTIME_HARD:
                    continue
                flags = []
                self.assigned_hours[eid][slot_date] += s_hours
                self.work_dates_by_emp[eid].add(slot_date)
                self.weekly_hours[eid] += s_hours
                self.last_shift_end[eid][slot_date] = s_end
                for h in range(s_start.hour, s_end.hour):
                    coverage[(slot_pos, slot_date, h)] += 1
                consec = self._consecutive_count(eid, slot_date)
                if consec == self.MAX_CONSECUTIVE_DAYS:
                    flags.append('连续工作6天')
                    warnings.append(dict(employee_id=eid, employee_name=emp.name, warning_type='consecutive_6_days', detail=emp.name + ' ' + str(slot_date) + ' 第6天'))
                prev_end = self.last_shift_end[eid].get(slot_date - timedelta(days=1))
                if prev_end:
                    prev_dt = datetime.combine(slot_date, prev_end)
                    curr_dt = datetime.combine(slot_date, s_start)
                    if (curr_dt - prev_dt).total_seconds() / 3600 < self.MIN_SHIFT_INTERVAL_HOURS:
                        flags.append('班次间隔<11h')
                        warnings.append(dict(employee_id=eid, employee_name=emp.name, warning_type='short_interval', detail=emp.name + ' ' + str(slot_date) + ' 间隔不足11h'))
                month_ot = self.existing_monthly_overtime.get(eid, 0) + max(0, self.weekly_hours[eid] - self.MAX_WEEKLY_HOURS)
                if month_ot > self.MAX_MONTHLY_OVERTIME_ADVISORY:
                    flags.append('月加班>30h')
                    warnings.append(dict(employee_id=eid, employee_name=emp.name, warning_type='monthly_overtime_30', detail=emp.name + ' 当月加班' + format(month_ot, '.1f') + 'h'))
                assignments.append(Assignment(employee_id=eid, position_id=slot_pos, date=slot_date, shift_start=s_start, shift_end=s_end, warning_flags=flags))
                assigned_count += 1

        gaps = []
        for r in self.requirements:
            actual = coverage.get((r.position_id, r.date, r.hour), 0)
            if actual < r.needed:
                gaps.append(dict(position_id=r.position_id, date=str(r.date), hour=r.hour, required=r.needed, actual=actual))

        msg = 'Schedule generated'
        if gaps:
            msg = 'Schedule generated with ' + str(len(gaps)) + ' gaps'
        seen = set()
        unique_warnings = []
        for w in warnings:
            key = (w['employee_id'], w['warning_type'])
            if key not in seen:
                seen.add(key)
                unique_warnings.append(w)
        return ScheduleResult(success=True, message=msg, assignments=assignments, coverage_gaps=gaps, warnings=unique_warnings)
