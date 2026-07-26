import React, { useEffect, useState } from "react";
import { Card, DatePicker, Select, Button, Table, Space, message, Tabs, Tag, Modal } from "antd";
import { LeftOutlined, RightOutlined, SettingOutlined, SaveOutlined, BarChartOutlined } from "@ant-design/icons";
import api from "../api/client";
import dayjs from "dayjs";

const POS_COLORS = ["#1890ff", "#52c41a", "#faad14", "#f5222d", "#722ed1", "#13c2c2", "#eb2f96", "#fa8c16"];

// Generate 48 half-hour slots 0:00 - 23:30
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => i * 0.5);
const fmtHalf = (h: number) => {
  const hr = Math.floor(h);
  const min = h % 1 === 0 ? "00" : "30";
  return `${String(hr).padStart(2, "0")}:${min}`;
};

export default function HourlyRequirementPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [reqs, setReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabKey, setTabKey] = useState("monthly");

  // Time slots
  const [timeslots, setTimeslots] = useState<any[]>([]);
  const [slotModal, setSlotModal] = useState(false);

  // Monthly: one week at a time
  const [weekOffset, setWeekOffset] = useState(0);
  const [calcData, setCalcData] = useState<any>(null);

  // Hourly
  const [hourlyDate, setHourlyDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [hourlyData, setHourlyData] = useState<any>(null);

  useEffect(() => { api.get("/positions/").then(r => setPositions(r.data)); }, []);

  const loadTimeslots = async () => {
    try { const r = await api.get("/position-timeslots/"); setTimeslots(r.data); } catch {}
  };

  const getWeekStart = () => {
    const today = dayjs();
    const dow = today.day();
    const diff = dow === 6 ? 0 : dow + 1;
    return today.subtract(diff, "day").startOf("day").add(weekOffset * 7, "day");
  };

  const loadCalcData = async () => {
    setLoading(true);
    const ws = getWeekStart();
    const we = ws.add(6, "day");
    try {
      const r = await api.get("/productivity/calculate-range", {
        params: { start_date: ws.format("YYYY-MM-DD"), end_date: we.format("YYYY-MM-DD") },
      });
      setCalcData(r.data);
    } catch { message.error("加载计算数据失败"); }
    setLoading(false);
  };

  const loadHourly = async () => {
    try {
      const r = await api.get("/productivity/calculate-hourly", { params: { date_str: hourlyDate } });
      setHourlyData(r.data);
    } catch {}
  };

  useEffect(() => { loadTimeslots(); loadCalcData(); }, [weekOffset]);

  const loadReqs = async () => {
    const ws = getWeekStart();
    const we = ws.add(6, "day");
    const params: any = { start_date: ws.format("YYYY-MM-DD"), end_date: we.format("YYYY-MM-DD") };
    if (selectedPos) params.position_id = selectedPos;
    const r = await api.get("/hourly-requirements/", { params });
    setReqs(r.data);
  };

  // === Weekly summary table ===
  const buildWeeklySummary = () => {
    if (!calcData) return { rows: [], dateCols: [] };
    const dates = Object.keys(calcData.results_by_date).sort();
    const posList = calcData.all_positions || [];
    const rows = posList.map((p: any) => {
      const row: any = { position_id: p.id, position_name: p.name, key: `pos_${p.id}` };
      let total = 0;
      dates.forEach(d => {
        const item = (calcData.results_by_date[d] || []).find((i: any) => i.position_id === p.id);
        const v = item ? item.required_headcount : 0;
        row[d] = v; total += v;
      });
      row["total"] = total;
      return row;
    });
    const tr: any = { position_name: "部门总需", key: "_total" };
    dates.forEach(d => { tr[d] = rows.reduce((s: any, r: any) => s + (r[d] || 0), 0); });
    tr["total"] = rows.reduce((s: any, r: any) => s + (r["total"] || 0), 0);
    return { rows: [...rows, tr], dateCols: dates };
  };

  const { rows: summaryRows, dateCols } = buildWeeklySummary();
  const summaryColumns = [
    { title: "岗位", dataIndex: "position_name", key: "pos", width: 90,
      render: (v: string, r: any) => r.key === "_total" ? <strong>{v}</strong> :
        <Tag color={POS_COLORS[positions.findIndex(p => p.name === v) % POS_COLORS.length]}>{v}</Tag>,
    },
    ...dateCols.map(d => ({
      title: dayjs(d).format("MM/DD"), dataIndex: d, key: d, width: 65,
      render: (v: number, r: any) => r.key === "_total" ? <strong>{v}</strong> : (v || "-"),
    })),
    { title: "合计", dataIndex: "total", key: "total", width: 55,
      render: (v: number, r: any) => <strong style={{ color: "#1890ff" }}>{v}</strong>,
    },
  ];

  // === Transposed hourly view: rows=positions, cols=30min slots ===
  const hourlyTransposed = () => {
    if (!hourlyData?.items) return { data: [], columns: [] };

    const columns: any[] = [
      { title: "岗位", dataIndex: "position_name", key: "pos", width: 80, fixed: "left" as const,
        render: (v: string) => <Tag color={POS_COLORS[positions.findIndex(p => p.name === v) % POS_COLORS.length]}>{v}</Tag>,
      },
      ...HALF_HOURS.map(h => ({
        title: <span style={{ fontSize: 10, writingMode: "vertical-lr" as any, height: 60 }}>{fmtHalf(h)}</span>,
        dataIndex: `t${h}`, key: `t${h}`, width: 32,
        render: (v: any) => v != null ? <div style={{ textAlign: "center" }}>{v}</div> : null,
      })),
    ];

    const data = hourlyData.items.map((item: any) => {
      const row: any = { key: `pos_${item.position_id}`, position_name: item.position_name };
      const startH = item.start_hour || 9;
      const endH = item.end_hour || 18;
      const hl = item.hourly_breakdown || [];

      HALF_HOURS.forEach(h => {
        const hourInt = Math.floor(h);
        if (hourInt >= startH && hourInt < endH) {
          const found = hl.find((hb: any) => hb.hour === hourInt);
          row[`t${h}`] = found ? found.headcount : "-";
        } else {
          row[`t${h}`] = null;
        }
      });
      return row;
    });

    return { data, columns };
  };

  const htv = hourlyTransposed();

  // === Gantt-style chart showing position time slots ===
  const TimeSlotChart = ({ slots, allPositions }: { slots: any[]; allPositions: any[] }) => {
    const cw = 500, ch = 30 * allPositions.length + 40;
    const pad = { left: 80, right: 20, top: 20, bottom: 10 };
    const iw = cw - pad.left - pad.right;
    const xS = (h: number) => pad.left + (h / 24) * iw;

    return (
      <svg viewBox={`0 0 ${cw} ${ch}`} style={{ width: "100%", maxHeight: ch }}>
        {/* Hour grid */}
        {Array.from({ length: 25 }, (_, i) => (
          <line key={i} x1={xS(i)} x2={xS(i)} y1={pad.top} y2={ch - pad.bottom} stroke={i % 6 === 0 ? "#d9d9d9" : "#f0f0f0"} strokeWidth={1} />
        ))}
        {[0, 6, 12, 18, 24].map(i => (
          <text key={i} x={xS(i)} y={ch - 2} textAnchor="middle" fill="#999" fontSize={9}>{`${i}:00`}</text>
        ))}
        {/* Position bars */}
        {allPositions.map((pos: any, pi: number) => {
          const slot = slots.find((s: any) => s.position_id === pos.id);
          const sh = slot?.start_hour ?? 9;
          const eh = slot?.end_hour ?? 18;
          const y = pad.top + pi * 30 + 6;
          return (
            <g key={pos.id}>
              <text x={pad.left - 6} y={y + 10} textAnchor="end" fill="#333" fontSize={11}>{pos.name}</text>
              <rect x={xS(sh)} y={y} width={xS(eh) - xS(sh)} height={18} rx={3}
                fill={POS_COLORS[pi % POS_COLORS.length]} opacity={0.7} />
              <text x={(xS(sh) + xS(eh)) / 2} y={y + 13} textAnchor="middle" fill="#fff" fontSize={10}>
                {`${sh}:00-${eh}:00`}
              </text>
            </g>
          );
        })}
        <line x1={xS(0)} x2={xS(24)} y1={pad.top} y2={pad.top} stroke="#d9d9d9" strokeWidth={1} />
        <line x1={xS(0)} x2={xS(24)} y1={ch - pad.bottom} y2={ch - pad.bottom} stroke="#d9d9d9" strokeWidth={1} />
      </svg>
    );
  };

  // === Time slot management modal ===
  const [editSlots, setEditSlots] = useState<any[]>([]);

  const openSlotModal = () => {
    // Pre-fill with all positions
    const merged = positions.map(p => {
      const existing = timeslots.find(ts => ts.position_id === p.id);
      return {
        position_id: p.id,
        position_name: p.name,
        start_hour: existing?.start_hour ?? 9,
        end_hour: existing?.end_hour ?? 18,
      };
    });
    setEditSlots(merged);
    setSlotModal(true);
  };

  const saveAllSlots = async () => {
    try {
      for (const es of editSlots) {
        const existing = timeslots.find(ts => ts.position_id === es.position_id);
        if (existing) {
          await api.put(`/position-timeslots/${existing.id}`, { start_hour: es.start_hour, end_hour: es.end_hour });
        } else {
          await api.post("/position-timeslots/", { position_id: es.position_id, start_hour: es.start_hour, end_hour: es.end_hour });
        }
      }
      message.success("所有时间段已保存");
      setSlotModal(false);
      loadTimeslots();
    } catch (e: any) {
      message.error("保存失败: " + (e.response?.data?.detail || e.message));
    }
  };

  const updateSlot = (posId: number, field: string, val: number) => {
    setEditSlots(prev => prev.map(s => s.position_id === posId ? { ...s, [field]: val } : s));
  };

  return (
    <div>
      <Card>
        <Space style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <Button icon={<SettingOutlined />} onClick={openSlotModal}>岗位时间段设置</Button>
          <Select placeholder="筛选岗位" allowClear style={{ width: 150 }} value={selectedPos} onChange={setSelectedPos}>
            {positions.map((p: any) => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
          </Select>
          <Button onClick={() => { loadReqs(); loadCalcData(); }}>查询</Button>
        </Space>

        <Tabs activeKey={tabKey} onChange={(k) => { setTabKey(k); if (k === "hourly") loadHourly(); if (k === "monthly") loadCalcData(); if (k === "detail") loadReqs(); }} items={[
          { key: "monthly", label: "周度汇总",
            children: (
              <div>
                <Space style={{ marginBottom: 12 }}>
                  <Button icon={<LeftOutlined />} onClick={() => setWeekOffset(w => w - 1)} />
                  <span style={{ fontWeight: 500, minWidth: 160, textAlign: "center", display: "inline-block" }}>
                    {getWeekStart().format("MM/DD")} — {getWeekStart().add(6, "day").format("MM/DD")}
                  </span>
                  <Button icon={<RightOutlined />} onClick={() => setWeekOffset(w => w + 1)} />
                  <Button size="small" onClick={() => { setWeekOffset(0); loadCalcData(); }}>本周</Button>
                </Space>
                {calcData ? (
                  <Table dataSource={summaryRows} columns={summaryColumns} rowKey="key" size="small" pagination={false} bordered loading={loading} scroll={{ x: true }} />
                ) : <Button type="primary" onClick={loadCalcData}>加载数据</Button>}
              </div>
            ),
          },
          { key: "hourly", label: "按小时视图",
            children: (
              <div>
                <Space style={{ marginBottom: 12, flexWrap: "wrap" }}>
                  <span>日期：</span>
                  <DatePicker value={dayjs(hourlyDate)} onChange={(v) => v && setHourlyDate(v.format("YYYY-MM-DD"))} />
                  <Button type="primary" onClick={loadHourly}>查询</Button>
                </Space>

                {hourlyData?.items ? (
                  <div style={{ overflowX: "auto" }}>
                    {/* Gantt chart above the table */}
                    <Card size="small" title={<span><BarChartOutlined /> 岗位时间段分布</span>} style={{ marginBottom: 12 }}>
                      <TimeSlotChart slots={timeslots} allPositions={hourlyData.items.map((i: any) => ({ id: i.position_id, name: i.position_name }))} />
                    </Card>

                    <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
                      <strong>时段网格：</strong>0:00-24:00，每格 30 分钟。深色格 = 该岗位在该时段有人力需求，浅色 = 岗位工作时间段外。
                    </div>
                    <Table dataSource={htv.data} columns={htv.columns} rowKey="key" size="small" pagination={false} bordered
                      scroll={{ x: 32 * 48 + 120 }} />
                  </div>
                ) : <div style={{ color: "#999", padding: 20, textAlign: "center" }}>选择日期后点击查询</div>}
              </div>
            ),
          },
          { key: "detail", label: "明细列表",
            children: <Table dataSource={reqs} columns={[
              { title: "日期", dataIndex: "date", key: "date" },
              { title: "岗位", dataIndex: "position_name", key: "pos" },
              { title: "时段", dataIndex: "hour", key: "hour", render: (h: number) => `${h}:00-${h+1}:00` },
              { title: "需到岗人数", dataIndex: "required_headcount", key: "cnt" },
            ]} rowKey="id" size="small" />,
          },
        ]} />
      </Card>

      {/* Time slot settings modal */}
      <Modal title="岗位时间段设置" open={slotModal} onCancel={() => setSlotModal(false)} width={700} footer={
        <Space><Button onClick={() => setSlotModal(false)}>取消</Button><Button type="primary" icon={<SaveOutlined />} onClick={saveAllSlots}>全部保存</Button></Space>
      }>
        <p style={{ color: "#888", marginBottom: 12 }}>为每个岗位设定工作时间段。点击开始/结束时间下拉框修改，点击"全部保存"生效。</p>

        {/* Chart preview in modal */}
        <Card size="small" title="岗位时间段预览" style={{ marginBottom: 12 }}>
          <TimeSlotChart slots={editSlots.map(s => ({ ...s, position_id: s.position_id }))} allPositions={editSlots} />
        </Card>

        <Table dataSource={editSlots} rowKey="position_id" size="small" pagination={false} bordered columns={[
          { title: "岗位", dataIndex: "position_name", key: "pos", width: 100 },
          { title: "开始时间", dataIndex: "start_hour", key: "start", width: 150,
            render: (v: number, r: any) => (
              <Select value={v} onChange={(val) => updateSlot(r.position_id, "start_hour", val)} style={{ width: 100 }} size="small">
                {Array.from({ length: 24 }, (_, i) => <Select.Option key={i} value={i}>{`${i}:00`}</Select.Option>)}
              </Select>
            ),
          },
          { title: "结束时间", dataIndex: "end_hour", key: "end", width: 150,
            render: (v: number, r: any) => (
              <Select value={v} onChange={(val) => updateSlot(r.position_id, "end_hour", val)} style={{ width: 100 }} size="small">
                {Array.from({ length: 24 }, (_, i) => <Select.Option key={i + 1} value={i + 1}>{`${i + 1}:00`}</Select.Option>)}
              </Select>
            ),
          },
          { title: "时长(小时)", key: "hours", width: 80,
            render: (_: any, r: any) => r.end_hour - r.start_hour,
          },
        ]} />
      </Modal>
    </div>
  );
}
