import React, { useEffect, useState } from "react";
import { Card, DatePicker, Select, InputNumber, Button, Table, Space, message, Upload, Tabs, Input, Tag, Tooltip } from "antd";
import { PlusOutlined, UploadOutlined, FlagOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../api/client";
import dayjs from "dayjs";

const COLORS = ["#1890ff", "#52c41a", "#faad14", "#f5222d", "#722ed1", "#13c2c2"];

interface Annotation {
  date: string;
  label: string;
}

function TrendChart({ data, annotations, onAnnotate }: { data: any[]; annotations: Annotation[]; onAnnotate: (a: Annotation[]) => void }) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return <div style={{ color: "#999", textAlign: "center", padding: 40 }}>暂无数据</div>;

  // Group by position
  const posMap: Record<string, { name: string; points: { date: string; vol: number }[] }> = {};
  sorted.forEach(f => {
    const key = f.position_name || `pos#${f.position_id}`;
    if (!posMap[key]) posMap[key] = { name: key, points: [] };
    const existing = posMap[key].points.find(p => p.date === f.date);
    if (existing) existing.vol += f.daily_volume;
    else posMap[key].points.push({ date: f.date, vol: f.daily_volume });
  });

  const posNames = Object.keys(posMap);
  const allDates = [...new Set(sorted.map(f => f.date))].sort();
  const maxVol = Math.max(...Object.values(posMap).flatMap(p => p.points.map(pt => pt.vol)), 1);

  const width = 700, height = 300;
  const pad = { top: 30, right: 30, bottom: 55, left: 55 };
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;
  const xScale = (i: number) => pad.left + (i / Math.max(allDates.length - 1, 1)) * iw;
  const yScale = (v: number) => pad.top + ih - (v / maxVol) * ih;
  const labelStep = Math.max(1, Math.floor(allDates.length / 7));

  // Build annotation markers
  const annMap: Record<string, Annotation> = {};
  annotations.forEach(a => { annMap[a.date] = a; });

  const [newAnnDate, setNewAnnDate] = useState("");
  const [newAnnLabel, setNewAnnLabel] = useState("");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxHeight: height }}>
        {/* Grid + Y axis */}
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={pad.left} x2={width - pad.right} y1={yScale(p * maxVol)} y2={yScale(p * maxVol)} stroke="#f0f0f0" strokeWidth={1} />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <text key={p} x={pad.left - 8} y={yScale(p * maxVol) + 4} textAnchor="end" fill="#999" fontSize={11}>{Math.round(p * maxVol)}</text>
        ))}

        {/* Per-position lines */}
        {posNames.map((name, pi) => {
          const pts = posMap[name].points;
          const sortedPts = [...pts].sort((a, b) => a.date.localeCompare(b.date));
          const points = sortedPts.map(pt => {
            const xi = allDates.indexOf(pt.date);
            return `${xScale(xi)},${yScale(pt.vol)}`;
          }).join(" ");
          return (
            <g key={name}>
              <polyline points={points} fill="none" stroke={COLORS[pi % COLORS.length]} strokeWidth={2} strokeLinejoin="round" />
              {sortedPts.map(pt => {
                const xi = allDates.indexOf(pt.date);
                return <circle key={pt.date} cx={xScale(xi)} cy={yScale(pt.vol)} r={3} fill={COLORS[pi % COLORS.length]} />;
              })}
            </g>
          );
        })}

        {/* X-axis labels */}
        {allDates.map((d, i) => {
          if (i % labelStep !== 0 && i !== allDates.length - 1) return null;
          return (
            <text key={d} x={xScale(i)} y={height - pad.bottom + 18} textAnchor="middle" fill="#999" fontSize={10}
              transform={`rotate(-30, ${xScale(i)}, ${height - pad.bottom + 18})`}>
              {dayjs(d).format("MM/DD")}
            </text>
          );
        })}

        {/* Annotations */}
        {Object.entries(annMap).map(([d, ann]) => {
          const xi = allDates.indexOf(d);
          if (xi === -1) return null;
          const x = xScale(xi), y = yScale(0) + 8;
          return (
            <g key={d}>
              <line x1={x} y1={pad.top} x2={x} y2={yScale(0)} stroke="#f5222d" strokeWidth={1} strokeDasharray="4,3" />
              <polygon points={`${x},${pad.top - 8} ${x - 5},${pad.top} ${x + 5},${pad.top}`} fill="#f5222d" />
              <text x={x} y={pad.top - 12} textAnchor="middle" fill="#f5222d" fontSize={10} fontWeight="bold">{ann.label}</text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} stroke="#d9d9d9" strokeWidth={1} />
        <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="#d9d9d9" strokeWidth={1} />
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "8px 0" }}>
        {posNames.map((name, pi) => (
          <span key={name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <span style={{ width: 12, height: 3, background: COLORS[pi % COLORS.length], display: "inline-block" }} />
            {name}
          </span>
        ))}
      </div>

      {/* Annotation editor */}
      <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 12, marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>关键日期标注</div>
        <Space style={{ marginBottom: 8 }}>
          <DatePicker size="small" onChange={(v) => v && setNewAnnDate(v.format("YYYY-MM-DD"))} />
          <Input size="small" placeholder="标注文字" value={newAnnLabel} onChange={e => setNewAnnLabel(e.target.value)} style={{ width: 150 }} />
          <Button size="small" type="primary" icon={<FlagOutlined />} onClick={() => {
            if (!newAnnDate || !newAnnLabel) return;
            onAnnotate([...annotations, { date: newAnnDate, label: newAnnLabel }]);
            setNewAnnDate("");
            setNewAnnLabel("");
          }}>添加标注</Button>
        </Space>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {annotations.map((a, i) => (
            <Tag key={i} closable onClose={() => onAnnotate(annotations.filter((_, j) => j !== i))}>
              {a.date} — {a.label}
            </Tag>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ForecastPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs(), dayjs().add(30, "day")]);
  const [inputDate, setInputDate] = useState<dayjs.Dayjs>(dayjs());
  const [inputPos, setInputPos] = useState<number | null>(null);
  const [inputVol, setInputVol] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [tabKey, setTabKey] = useState("manual");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => { api.get("/positions/").then(r => setPositions(r.data)); }, []);

  const loadForecasts = async () => {
    if (!dateRange[0] || !dateRange[1]) return;
    const res = await api.get("/forecasts/", {
      params: { start_date: dateRange[0].format("YYYY-MM-DD"), end_date: dateRange[1].format("YYYY-MM-DD") },
    });
    setForecasts(res.data);
  };

  useEffect(() => { loadForecasts(); }, [dateRange]);

  const handleSubmit = async () => {
    if (!inputPos || !inputDate) return;
    setSubmitting(true);
    try {
      await api.post("/forecasts/batch", {
        items: [{ position_id: inputPos, date: inputDate.format("YYYY-MM-DD"), daily_volume: inputVol }],
      });
      message.success("已保存");
      loadForecasts();
    } catch (e: any) {
      message.error("保存失败: " + (e.response?.data?.detail || e.message));
    } finally { setSubmitting(false); }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/forecasts/import", formData, { headers: { "Content-Type": "multipart/form-data" } });
      message.success("导入成功: " + res.data.imported + " 条记录");
      loadForecasts();
    } catch (e: any) {
      message.error("导入失败: " + (e.response?.data?.detail || e.message));
    } finally { setImporting(false); }
    return false;
  };

  const columns = [
    { title: "日期", dataIndex: "date", key: "date" },
    { title: "岗位", dataIndex: "position_name", key: "pos" },
    { title: "业务量", dataIndex: "daily_volume", key: "vol" },
  ];

  return (
    <div>
      <Tabs activeKey={tabKey} onChange={setTabKey} items={[
        { key: "manual", label: "手动录入",
          children: (
            <Card style={{ marginBottom: 16 }}>
              <Space style={{ marginBottom: 16 }}>
                <DatePicker value={inputDate} onChange={(v) => v && setInputDate(v)} />
                <Select placeholder="选择岗位" style={{ width: 150 }} value={inputPos} onChange={setInputPos}>
                  {positions.map((p: any) => (<Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>))}
                </Select>
                <InputNumber placeholder="预估业务量" min={0} value={inputVol} onChange={(v) => setInputVol(v || 0)} />
                <Button type="primary" icon={<PlusOutlined />} loading={submitting} onClick={handleSubmit}>添加</Button>
              </Space>
            </Card>
          ),
        },
        { key: "import", label: "文件导入",
          children: (
            <Card style={{ marginBottom: 16 }}>
              <p>支持 CSV / Excel (.xlsx / .xls) 格式</p>
              <p style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>表头需包含: position_id 或 position_name, date, daily_volume</p>
              <Upload.Dragger accept=".csv,.xlsx,.xls" showUploadList={false} beforeUpload={handleImport} disabled={importing}>
                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">支持 CSV 和 Excel 文件</p>
              </Upload.Dragger>
              {importing && <p style={{ marginTop: 12, color: "#1890ff" }}>导入中...</p>}
            </Card>
          ),
        },
      ]} />

      <Card title="查询月度预测">
        <Space style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <DatePicker.RangePicker value={dateRange} onChange={(v) => v && setDateRange([v[0]!, v[1]!])} />
          <Button type="primary" onClick={loadForecasts}>查询</Button>
        </Space>
        <Table dataSource={forecasts} columns={columns} rowKey="id" size="small" />
      </Card>

      <Card title="预测趋势图">
        <TrendChart data={forecasts} annotations={annotations} onAnnotate={setAnnotations} />
      </Card>
    </div>
  );
}
