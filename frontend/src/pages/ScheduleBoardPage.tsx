import React, { useEffect, useState, useMemo } from "react";
import { Card, DatePicker, Button, Table, Space, Tag, message, Alert, Tooltip } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import api from "../api/client";
import dayjs from "dayjs";

const POS_COLORS: Record<string, string> = {};
const COLOR_LIST = ["#1890ff", "#52c41a", "#faad14", "#f5222d", "#722ed1", "#13c2c2", "#eb2f96", "#fa8c16"];
const weekdayLabels = ["周六", "周日", "周一", "周二", "周三", "周四", "周五"];

export default function ScheduleBoardPage() {
  const getThisWeekStart = () => {
    const today = dayjs();
    const dow = today.day();
    const diff = dow === 6 ? 0 : dow + 1;
    return today.subtract(diff, "day").startOf("day");
  };
  const [weekStart, setWeekStart] = useState(getThisWeekStart());
  const [assignments, setAssignments] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gaps, setGaps] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [infeasible, setInfeasible] = useState<any[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [empRes, schedRes] = await Promise.all([
        api.get("/employees/"),
        api.get("/schedules/week/" + weekStart.format("YYYY-MM-DD")).catch(() => ({ data: [] })),
      ]);
      setAllEmployees(empRes.data);
      setAssignments(schedRes.data);
    } catch {} finally { setLoading(false); }
  };

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.post("/schedules/generate", { week_start: weekStart.format("YYYY-MM-DD") });
      const data = res.data;
      if (!data.success) {
        message.error("生成失败");
        setInfeasible(data.infeasible_reasons || []);
      } else {
        message.success(data.message);
        setGaps(data.coverage_gaps || []);
        setWarnings(data.warnings || []);
      }
      loadAll();
    } catch (e: any) {
      message.error("生成出错: " + (e.response?.data?.detail || e.message));
      loadAll();
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [weekStart]);

  const pivotData = useMemo(() => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) dates.push(weekStart.add(i, "day").format("YYYY-MM-DD"));

    const posNames = [...new Set(assignments.map(a => a.position_name))].filter(Boolean);
    let ci = 0;
    posNames.forEach(p => { if (!POS_COLORS[p]) POS_COLORS[p] = COLOR_LIST[ci++ % COLOR_LIST.length]; });

    // Build shift map: employee_id -> date -> shifts[]
    const shiftMap: Record<number, Record<string, any[]>> = {};
    assignments.forEach(a => {
      if (!shiftMap[a.employee_id]) shiftMap[a.employee_id] = {};
      if (!shiftMap[a.employee_id][a.date]) shiftMap[a.employee_id][a.date] = [];
      shiftMap[a.employee_id][a.date].push(a);
    });

    // Include ALL employees
    const rows = allEmployees
      .filter(e => e.role === "employee")
      .map(emp => {
        const row: any = { key: emp.id, employee_name: emp.name };
        dates.forEach(d => {
          const shifts = shiftMap[emp.id]?.[d] || [];
          row[d] = shifts;
        });
        return row;
      });

    return { dates, rows, posNames };
  }, [assignments, allEmployees, weekStart]);

  const columns = [
    { title: "员工", dataIndex: "employee_name", key: "emp", fixed: "left" as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    ...pivotData.dates.map((d, i) => ({
      title: <div style={{ textAlign: "center" }}>{dayjs(d).format("MM/DD")}<br/><small>{weekdayLabels[i]}</small></div>,
      dataIndex: d, key: d,
      render: (shifts: any[]) => {
        if (!shifts || shifts.length === 0) return <span style={{ color: "#ccc" }}>休</span>;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {shifts.map((s: any, si: number) => {
              const hasWarn = s.warning_flags && s.warning_flags.length > 0;
              return (
                <Tooltip key={si} title={hasWarn ? `⚠ ${s.warning_flags}` : s.position_name}>
                  <Tag
                    color={POS_COLORS[s.position_name] || "#1890ff"}
                    style={{ margin: 0, whiteSpace: "nowrap", fontSize: 11, border: hasWarn ? "2px solid #f5222d" : undefined }}
                  >
                    {hasWarn && <WarningOutlined style={{ color: "#f5222d", marginRight: 2 }} />}
                    {s.position_name}<br/>{s.shift_start?.slice(0, 5)}-{s.shift_end?.slice(0, 5)}
                  </Tag>
                </Tooltip>
              );
            })}
          </div>
        );
      },
      width: 130,
    })),
  ];

  return (
    <div>
      <Card title="排班面板" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <DatePicker value={weekStart} onChange={(v) => v && setWeekStart(v)} picker="week" />
          <Button type="primary" onClick={generate} loading={loading}>生成排班</Button>
          <Button onClick={loadAll}>刷新</Button>
        </Space>

        {infeasible.length > 0 && (
          <Alert type="error" message="无法生成排班" description={infeasible.map((r, i) => <div key={i}>{r}</div>)} style={{ marginBottom: 16 }} />
        )}

        {gaps.length > 0 && (
          <Alert type="warning" message={`存在 ${gaps.length} 个覆盖缺口`} description={gaps.slice(0, 10).map((g, i) => <div key={i}>{g.date} {g.hour}:00 需{g.required}人 实{g.actual}人</div>)} style={{ marginBottom: 16 }} />
        )}

        {/* Detailed warnings list */}
        {warnings.length > 0 && (
          <Alert
            type="warning"
            message={
              <div>
                <strong>建议规则警告（{warnings.length} 条）</strong>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {warnings.map((w, i) => (
                    <div key={i} style={{ padding: "2px 0" }}>⚠ {w.employee_name}：{w.detail}</div>
                  ))}
                </div>
              </div>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Position color legend */}
        {pivotData.posNames.length > 0 && (
          <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
            {pivotData.posNames.map(pn => (
              <span key={pn} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: POS_COLORS[pn] || "#1890ff", display: "inline-block" }} />
                {pn}
              </span>
            ))}
          </div>
        )}

        <Table
          dataSource={pivotData.rows}
          columns={columns}
          rowKey="key"
          loading={loading}
          size="small"
          bordered
          pagination={false}
          scroll={{ x: true }}
        />
      </Card>
    </div>
  );
}
