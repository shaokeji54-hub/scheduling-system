import React, { useEffect, useState } from "react";
import { Card, DatePicker, Select, InputNumber, Button, Table, Space, message, TimePicker } from "antd";
import api from "../api/client";
import dayjs from "dayjs";

export default function HourlyRequirementPage() {
  const [positions, setPositions] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs(), dayjs().add(7, "day")]);

  useEffect(() => { api.get("/positions/").then(r => setPositions(r.data)); }, []);

  const load = async () => {
    if (!dateRange[0] || !dateRange[1]) return;
    const params: any = { start_date: dateRange[0].format("YYYY-MM-DD"), end_date: dateRange[1].format("YYYY-MM-DD") };
    if (selectedPos) params.position_id = selectedPos;
    const res = await api.get("/hourly-requirements/", { params });
    setReqs(res.data);
  };

  const columns = [
    { title: "日期", dataIndex: "date", key: "date" },
    { title: "岗位", dataIndex: "position_name", key: "pos" },
    { title: "时段", dataIndex: "hour", key: "hour", render: (h: number) => h + ":00" },
    { title: "需到岗人数", dataIndex: "required_headcount", key: "cnt" },
  ];

  return (
    <div>
      <Card title="每小时人力需求" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <DatePicker.RangePicker value={dateRange} onChange={(v) => v && setDateRange([v[0]!, v[1]!])} />
          <Select placeholder="选择岗位" allowClear style={{ width: 150 }} onChange={setSelectedPos}>
            {positions.map((p: any) => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
          </Select>
          <Button type="primary" onClick={load}>查询</Button>
        </Space>
        <Table dataSource={reqs} columns={columns} rowKey="id" size="small" />
      </Card>
    </div>
  );
}