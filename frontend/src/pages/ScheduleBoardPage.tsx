import React, { useEffect, useState } from "react";
import { Card, DatePicker, Button, Table, Space, Tag, message, Modal, Select, TimePicker, Alert, Spin } from "antd";
import api from "../api/client";
import dayjs from "dayjs";

export default function ScheduleBoardPage() {
  const [weekStart, setWeekStart] = useState(dayjs().startOf("week").add(1, "day"));
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gaps, setGaps] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [infeasible, setInfeasible] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/schedules/week/" + weekStart.format("YYYY-MM-DD"));
      setAssignments(res.data);
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
        setAssignments(data.assignments || []);
        setGaps(data.coverage_gaps || []);
        setWarnings(data.warnings || []);
      }
      load();
    } catch (e: any) {
      message.error("生成出错: " + (e.response?.data?.detail || e.message));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [weekStart]);

  const columns = [
    { title: "员工", dataIndex: "employee_name", key: "emp" },
    { title: "岗位", dataIndex: "position_name", key: "pos" },
    { title: "日期", dataIndex: "date", key: "date" },
    { title: "开始", dataIndex: "shift_start", key: "start" },
    { title: "结束", dataIndex: "shift_end", key: "end" },
    { title: "状态", dataIndex: "status", key: "status", render: (s: string) => s === "confirmed" ? <Tag color="green">终版</Tag> : <Tag color="orange">草案</Tag> },
    { title: "警告", dataIndex: "warning_flags", key: "warn", render: (f: string) => f ? f.split(",").map((w: string, i: number) => <Tag color="red" key={i}>{w}</Tag>) : null },
  ];

  return (
    <div>
      <Card title="排班面板" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <DatePicker value={weekStart} onChange={(v) => v && setWeekStart(v)} picker="week" />
          <Button type="primary" onClick={generate} loading={loading}>生成排班</Button>
          <Button onClick={load}>刷新</Button>
        </Space>

        {infeasible.length > 0 && (
          <Alert type="error" message="无法生成排班" description={infeasible.map((r: string, i: number) => <div key={i}>{r}</div>)} style={{ marginBottom: 16 }} />
        )}

        {gaps.length > 0 && (
          <Alert type="warning" message={`存在 ${gaps.length} 个覆盖缺口`} description={gaps.slice(0, 5).map((g: any, i: number) => <div key={i}>{g.date} pos#{g.position_id} h{g.hour}: 需{g.required}人 实{g.actual}人</div>)} style={{ marginBottom: 16 }} />
        )}

        {warnings.length > 0 && (
          <Alert type="warning" message={`存在 ${warnings.length} 条建议规则警告`} style={{ marginBottom: 16 }} />
        )}

        <Table dataSource={assignments} columns={columns} rowKey="id" loading={loading} size="small" scroll={{ x: true }} />
      </Card>
    </div>
  );
}