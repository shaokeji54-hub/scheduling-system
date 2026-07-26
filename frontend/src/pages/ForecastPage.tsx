import React, { useEffect, useState } from "react";
import { Card, DatePicker, Select, InputNumber, Button, Table, Space, message, Form } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import api from "../api/client";
import dayjs from "dayjs";

export default function ForecastPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs(), dayjs().add(30, "day")]);
  const [inputDate, setInputDate] = useState<dayjs.Dayjs>(dayjs());
  const [inputPos, setInputPos] = useState<number | null>(null);
  const [inputVol, setInputVol] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/positions/").then(r => setPositions(r.data));
  }, []);

  const loadForecasts = async () => {
    if (!dateRange[0] || !dateRange[1]) return;
    const res = await api.get("/forecasts/", {
      params: {
        start_date: dateRange[0].format("YYYY-MM-DD"),
        end_date: dateRange[1].format("YYYY-MM-DD"),
      },
    });
    setForecasts(res.data);
  };

  const handleSubmit = async () => {
    if (!inputPos || !inputDate) return;
    setSubmitting(true);
    try {
      await api.post("/forecasts/batch", {
        items: [{
          position_id: inputPos,
          date: inputDate.format("YYYY-MM-DD"),
          daily_volume: inputVol,
        }],
      });
      message.success("已保存");
      loadForecasts();
    } catch (e: any) {
      message.error("保存失败: " + (e.response?.data?.detail || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: "日期", dataIndex: "date", key: "date" },
    { title: "岗位", dataIndex: "position_name", key: "pos" },
    { title: "业务量", dataIndex: "daily_volume", key: "vol" },
  ];

  return (
    <div>
      <Card title="录入业务量预测" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <DatePicker value={inputDate} onChange={(v) => v && setInputDate(v)} />
          <Select
            placeholder="选择岗位"
            style={{ width: 150 }}
            value={inputPos}
            onChange={setInputPos}
          >
            {positions.map((p: any) => (
              <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
            ))}
          </Select>
          <InputNumber
            placeholder="预估业务量"
            min={0}
            value={inputVol}
            onChange={(v) => setInputVol(v || 0)}
          />
          <Button type="primary" icon={<PlusOutlined />} loading={submitting} onClick={handleSubmit}>
            添加
          </Button>
        </Space>
      </Card>

      <Card title="查询月度预测">
        <Space style={{ marginBottom: 16 }}>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(v) => v && setDateRange([v[0]!, v[1]!])}
          />
          <Button type="primary" onClick={loadForecasts}>查询</Button>
        </Space>
        <Table dataSource={forecasts} columns={columns} rowKey="id" size="small" />
      </Card>
    </div>
  );
}