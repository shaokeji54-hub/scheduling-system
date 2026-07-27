import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, DatePicker, Button, Table, Space, Tag, message, Alert, Tooltip, Modal, Select, TimePicker, Popconfirm } from "antd";
import { WarningOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import api from "../api/client";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

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
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gaps, setGaps] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [infeasible, setInfeasible] = useState<any[]>([]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<any>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editShifts, setEditShifts] = useState<any[]>([]);
  const [addPosId, setAddPosId] = useState<number | null>(null);
  const [addStart, setAddStart] = useState<dayjs.Dayjs>(dayjs().hour(9).minute(0));
  const [addEnd, setAddEnd] = useState<dayjs.Dayjs>(dayjs().hour(17).minute(0));
  const [addOvernight, setAddOvernight] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/positions/").then(r => setPositions(r.data));
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [empRes, schedRes] = await Promise.all([
        api.get("/employees/"),
        api.get("/schedules/week/" + weekStart.format("YYYY-MM-DD")).catch(() => ({ data: [] })),
      ]);
      setAllEmployees(empRes.data);
      setAssignments(schedRes.data);
      // Re-fetch gaps/warnings from latest generate
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

  const openEditModal = useCallback((emp: any, dateStr: string, shifts: any[]) => {
    setEditEmp(emp);
    setEditDate(dateStr);
    setEditShifts(shifts || []);
    setAddPosId(positions.length > 0 ? positions[0].id : null);
    setAddStart(dayjs().hour(9).minute(0));
    setAddEnd(dayjs().hour(17).minute(0));
    setAddOvernight(false);
    setEditModalOpen(true);
  }, [positions]);

  const reloadAndRefresh = async () => {
    await loadAll();
    // Re-fetch the edit shifts after reload
    if (editEmp && editDate) {
      const schedRes = await api.get("/schedules/week/" + weekStart.format("YYYY-MM-DD")).catch(() => ({ data: [] }));
      const shiftMap: Record<string, any[]> = {};
      schedRes.data.forEach((a: any) => {
        if (a.employee_id === editEmp.id && a.date === editDate) {
          if (!shiftMap[a.date]) shiftMap[a.date] = [];
          shiftMap[a.date].push(a);
        }
      });
      setEditShifts(shiftMap[editDate] || []);
    }
  };

  const handleDeleteShift = async (shiftId: number) => {
    try {
      await api.delete("/schedules/assignments/" + shiftId);
      message.success("班次已删除");
    } catch (e: any) {
      message.error("删除失败: " + (e.response?.data?.detail || e.message));
    }
    await reloadAndRefresh();
  };

  const handleUpdateShift = async (shift: any, updates: any) => {
    try {
      const updateData: any = {};
      if (updates.shift_start) updateData.shift_start = updates.shift_start.format("HH:mm:ss");
      if (updates.shift_end) updateData.shift_end = updates.shift_end.format("HH:mm:ss");
      if (updates.position_id !== undefined) updateData.position_id = updates.position_id;
      await api.put("/schedules/assignments/" + shift.id, updateData);
      message.success("班次已更新");
    } catch (e: any) {
      message.error("更新失败: " + (e.response?.data?.detail || e.message));
    }
    await reloadAndRefresh();
  };

  const handleAddShift = async () => {
    if (!editEmp || !addPosId) return;
    setSubmitting(true);
    try {
      const rawEnd = addEnd.hour() + (addOvernight ? 0 : 0);
      const isOvernight = addOvernight || addEnd.hour() <= addStart.hour();
      await api.post("/schedules/assignments", {
        employee_id: editEmp.id,
        position_id: addPosId,
        date: editDate,
        shift_start: addStart.format("HH:mm:ss"),
        shift_end: addEnd.format("HH:mm:ss"),
        status: "preliminary",
        is_overnight: isOvernight,
      });
      message.success("班次已添加");
    } catch (e: any) {
      message.error("添加失败: " + (e.response?.data?.detail || e.message));
    } finally {
      setSubmitting(false);
    }
    await reloadAndRefresh();
  };

  const pivotData = useMemo(() => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) dates.push(weekStart.add(i, "day").format("YYYY-MM-DD"));

    const posNames = [...new Set(assignments.map(a => a.position_name))].filter(Boolean);
    let ci = 0;
    posNames.forEach(p => { if (!POS_COLORS[p]) POS_COLORS[p] = COLOR_LIST[ci++ % COLOR_LIST.length]; });

    const shiftMap: Record<number, Record<string, any[]>> = {};
    assignments.forEach(a => {
      if (!shiftMap[a.employee_id]) shiftMap[a.employee_id] = {};
      if (!shiftMap[a.employee_id][a.date]) shiftMap[a.employee_id][a.date] = [];
      shiftMap[a.employee_id][a.date].push(a);
    });

    const rows = allEmployees
      .filter(e => e.role === "employee")
      .map(emp => {
        const row: any = { key: emp.id, employee_name: emp.name, _emp: emp };
        dates.forEach(d => {
          row[d] = shiftMap[emp.id]?.[d] || [];
        });
        return row;
      });

    return { dates, rows, posNames };
  }, [assignments, allEmployees, weekStart]);

  const cellRender = (record: any, dateStr: string) => {
    const emp = record._emp;
    const shifts: any[] = record[dateStr] || [];
    const isEmpty = !shifts || shifts.length === 0;
    return (
      <div
        onClick={() => openEditModal(emp, dateStr, shifts)}
        style={{ cursor: "pointer", minHeight: 36, display: "flex", flexDirection: "column", gap: 1, padding: 1 }}
      >
        {isEmpty ? (
          <span style={{ color: "#bbb", fontSize: 11 }}>休</span>
        ) : (
          shifts.map((s: any, si: number) => {
      const hasWarn = s.warning_flags && s.warning_flags.length > 0;
      const timeStr = (s.is_overnight ? "🌙 " : "") + s.shift_start?.slice(0, 5) + "-" + s.shift_end?.slice(0, 5) + (s.is_overnight ? "(+1)" : "");
      return (
        <Tooltip key={s.id || si} title={hasWarn ? "⚠ " + s.warning_flags : s.position_name}>
                <Tag
                  color={POS_COLORS[s.position_name] || "#1890ff"}
                  style={{ margin: 0, whiteSpace: "nowrap", fontSize: 10, lineHeight: "16px", border: hasWarn ? "2px solid #f5222d" : undefined }}
                  >
                    {hasWarn && <WarningOutlined style={{ color: "#f5222d", marginRight: 1, fontSize: 10 }} />}
                    {s.position_name} {timeStr}
                </Tag>
              </Tooltip>
            );
          })
        )}
        <div style={{ fontSize: 8, color: "#aaa", textAlign: "center" }}>点击编辑</div>
      </div>
    );
  };

  const columns = [
    {
      title: "员工", dataIndex: "employee_name", key: "emp", fixed: "left" as const, width: 70,
      render: (v: string) => <strong style={{ fontSize: 12 }}>{v}</strong>,
    },
    ...pivotData.dates.map((d, i) => ({
      title: <div style={{ textAlign: "center", lineHeight: 1.2 }}>{dayjs(d).format("MM/DD")}<br/><small>{weekdayLabels[i]}</small></div>,
      dataIndex: d, key: d,
      render: (_: any, record: any) => cellRender(record, d),
      width: 120,
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
          <Alert type="warning" message={"存在 " + gaps.length + " 个覆盖缺口"} description={gaps.slice(0, 10).map((g, i) => <div key={i}>{g.date} {g.hour}:00 需{g.required}人 实{g.actual}人</div>)} style={{ marginBottom: 16 }} />
        )}

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

      <Modal
        title={"编辑班次 — " + (editEmp?.name || "") + " " + (editDate ? dayjs(editDate).format("MM/DD ddd") : "")}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        width={500}
        footer={null}
        destroyOnClose
      >
        <div>
          {editShifts.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 13 }}>已有班次：</div>
              {editShifts.map((s: any) => (
                <Card key={s.id} size="small" style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Space>
                      <Tag color={POS_COLORS[s.position_name] || "#1890ff"}>{s.position_name}</Tag>
              <span style={{ fontSize: 12 }}>{s.shift_start?.slice(0, 5)} - {s.shift_end?.slice(0, 5)}</span>
              {s.is_overnight ? <Tag color="purple" style={{ fontSize: 10 }}>跨夜</Tag> : null}
              {s.warning_flags ? <WarningOutlined style={{ color: "#faad14" }} /> : null}
                    </Space>
                    <Space>
                      <Popconfirm title="确认删除此班次？" onConfirm={() => handleDeleteShift(s.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                      </Popconfirm>
                    </Space>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#888" }}>调岗：</span>
                    <Select
                      size="small" style={{ width: 120 }}
                      value={s.position_id}
                      onChange={(val) => handleUpdateShift(s, { position_id: val })}
                    >
                      {positions.map((p: any) => (
                        <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                      ))}
                    </Select>
                    <TimePicker.RangePicker
                      size="small" style={{ width: 180 }}
                      value={[dayjs(s.shift_start, "HH:mm:ss"), dayjs(s.shift_end, "HH:mm:ss")]}
                      onChange={(vals) => { if (vals && vals[0] && vals[1]) handleUpdateShift(s, { shift_start: vals[0], shift_end: vals[1] }); }}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 13 }}>
              <PlusOutlined /> 添加新班次
            </div>
            <Space style={{ marginBottom: 12, flexWrap: "wrap" }}>
              <Select
                placeholder="选择岗位" style={{ width: 130 }} size="small"
                value={addPosId}
                onChange={setAddPosId}
              >
                {positions.map((p: any) => (
                  <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                ))}
              </Select>
              <TimePicker size="small" value={addStart} onChange={(v) => v && setAddStart(v)} format="HH:mm" minuteStep={30} />
              <span style={{ color: "#888" }}>至</span>
              <TimePicker size="small" value={addEnd} onChange={(v) => v && setAddEnd(v)} format="HH:mm" minuteStep={30} />
              <span style={{ fontSize: 11, color: "#888" }}>
                <input type="checkbox" checked={addOvernight} onChange={(e) => setAddOvernight(e.target.checked)} /> 跨夜
              </span>
              <Button type="primary" size="small" icon={<PlusOutlined />} loading={submitting} onClick={handleAddShift}>添加</Button>
            </Space>
          </div>
        </div>
      </Modal>
    </div>
  );
}
