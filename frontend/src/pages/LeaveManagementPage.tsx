import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message } from "antd";
import api from "../api/client";

export default function LeaveManagementPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/leaves/");
      setLeaves(res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const review = async (id: number, status: string) => {
    try {
      await api.put("/leaves/" + id + "/review", { status });
      message.success(status === "approved" ? "已批准" : "已拒绝");
      load();
    } catch { message.error("操作失败"); }
  };

  const columns = [
    { title: "员工", dataIndex: "employee_name", key: "emp" },
    { title: "日期", dataIndex: "leave_date", key: "date" },
    { title: "类型", dataIndex: "leave_type", key: "type", render: (t: string) => ({ annual: "年假", sick: "病假", personal: "事假", comp: "调休" }[t] || t) },
    { title: "状态", dataIndex: "status", key: "status", render: (s: string) => s === "pending" ? <Tag color="orange">待审</Tag> : s === "approved" ? <Tag color="green">已批</Tag> : <Tag color="red">已拒</Tag> },
    { title: "预检反馈", dataIndex: "submit_feedback", key: "feedback" },
    { title: "拒绝原因", dataIndex: "rejection_reason", key: "reason" },
    { title: "操作", key: "action", render: (_: any, record: any) => record.status === "pending" ? (
      <Space>
        <Button size="small" type="primary" onClick={() => review(record.id, "approved")}>批准</Button>
        <Button size="small" danger onClick={() => {
          const reason = prompt("拒绝原因：");
          if (reason !== null) review(record.id, "rejected");
        }}>拒绝</Button>
      </Space>
    ) : null },
  ];

  return <Table dataSource={leaves} columns={columns} rowKey="id" loading={loading} />;
}