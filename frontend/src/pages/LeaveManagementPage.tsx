import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message, Modal, Select, DatePicker } from "antd";
import api from "../api/client";
import dayjs from "dayjs";

export default function LeaveManagementPage() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newEmpId, setNewEmpId] = useState<number | null>(null);
  const [newDate, setNewDate] = useState<dayjs.Dayjs>(dayjs());
  const [newType, setNewType] = useState("annual");
  const [submitting, setSubmitting] = useState(false);

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

  const handleModalOpen = async () => {
    try {
      const res = await api.get("/employees/");
      setEmployees(res.data);
    } catch {}
    setModalOpen(true);
  };

  const handleSubmitLeave = async () => {
    if (!newEmpId || !newDate) return;
    setSubmitting(true);
    try {
      await api.post("/leaves/", {
        employee_id: newEmpId,
        leave_date: newDate.format("YYYY-MM-DD"),
        leave_type: newType,
      });
      message.success("已代填休假申请");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error("提交失败: " + (e.response?.data?.detail || e.message));
    } finally { setSubmitting(false); }
  };

  const columns = [
    { title: "员工", dataIndex: "employee_name", key: "emp" },
    { title: "日期", dataIndex: "leave_date", key: "date" },
    { title: "类型", dataIndex: "leave_type", key: "type", render: (t: string) => ({ annual: "年假", sick: "病假", personal: "事假", comp: "调休" }[t] || t) },
    { title: "来源", dataIndex: "creator_type", key: "creator", render: (t: string, r: any) =>
      t === "scheduler"
        ? <Tag color="blue">排班员代填</Tag>
        : <Tag color="default">员工自填</Tag>
    },
    { title: "状态", dataIndex: "status", key: "status", render: (s: string) => s === "pending" ? <Tag color="orange">待审</Tag> : s === "approved" ? <Tag color="green">已批</Tag> : <Tag color="red">已拒</Tag> },
    { title: "预检反馈", dataIndex: "submit_feedback", key: "feedback" },
    { title: "拒绝原因", dataIndex: "rejection_reason", key: "reason" },
    { title: "操作", key: "action", render: (_: any, record: any) => record.status === "pending" ? (
      <Space>
        <Button size="small" type="primary" onClick={() => review(record.id, "approved")}>批准</Button>
        <Button size="small" danger onClick={async () => {
          const reason = prompt("拒绝原因：");
          if (reason !== null) {
            try {
              await api.put("/leaves/" + record.id + "/review", { status: "rejected", rejection_reason: reason });
              message.success("已拒绝");
              load();
            } catch { message.error("操作失败"); }
          }
        }}>拒绝</Button>
      </Space>
    ) : null },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleModalOpen}>代填休假</Button>
      </div>

      <Modal
        title="排班员代填休假"
        open={modalOpen}
        onOk={handleSubmitLeave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ marginBottom: 4 }}>选择员工</div>
            <Select
              placeholder="选择员工"
              style={{ width: "100%" }}
              value={newEmpId}
              onChange={setNewEmpId}
            >
              {employees.map((e: any) => (
                <Select.Option key={e.id} value={e.id}>{e.name}</Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>休假日期</div>
            <DatePicker value={newDate} onChange={(v) => v && setNewDate(v)} style={{ width: "100%" }} />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>休假类型</div>
            <Select value={newType} onChange={setNewType} style={{ width: "100%" }}>
              <Select.Option value="annual">年假</Select.Option>
              <Select.Option value="sick">病假</Select.Option>
              <Select.Option value="personal">事假</Select.Option>
              <Select.Option value="comp">调休</Select.Option>
            </Select>
          </div>
        </div>
      </Modal>

      <Table dataSource={leaves} columns={columns} rowKey="id" loading={loading} />
    </div>
  );
}
