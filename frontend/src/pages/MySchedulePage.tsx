import React, { useEffect, useState } from "react";
import { Card, Table, Tag, Button, DatePicker, Select, Form, message, Space, Divider } from "antd";
import api from "../api/client";
import dayjs from "dayjs";

export default function MySchedulePage() {
  const [assignments, setAssignments] = useState([]);
  const [leaveForm] = Form.useForm();

  const loadSchedule = async () => {
    try {
      const res = await api.get("/schedules/my");
      setAssignments(res.data);
    } catch {}
  };

  const submitLeave = async (values: any) => {
    try {
      await api.post("/leaves/", { leave_date: values.leave_date.format("YYYY-MM-DD"), leave_type: values.leave_type });
      message.success("休假申请已提交");
      leaveForm.resetFields();
    } catch (e: any) {
      const feedback = e.response?.data?.submit_feedback;
      if (feedback) message.warning(feedback);
      else message.error("提交失败");
    }
  };

  useEffect(() => { loadSchedule(); }, []);

  const columns = [
    { title: "日期", dataIndex: "date", key: "date" },
    { title: "岗位", dataIndex: "position_name", key: "pos" },
    { title: "开始", dataIndex: "shift_start", key: "start" },
    { title: "结束", dataIndex: "shift_end", key: "end" },
    { title: "状态", dataIndex: "status", key: "status", render: (s: string) => s === "confirmed" ? <Tag color="green">已确认</Tag> : <Tag color="orange">草案</Tag> },
    { title: "警告", dataIndex: "warning_flags", key: "warn", render: (f: string) => f ? f.split(",").map((w: string, i: number) => <Tag color="red" key={i}>{w}</Tag>) : null },
  ];

  return (
    <div>
      <Card title="我的班表" style={{ marginBottom: 16 }}>
        <Table dataSource={assignments} columns={columns} rowKey="id" size="small" />
      </Card>
      <Card title="提交休假申请">
        <Form form={leaveForm} layout="inline" onFinish={submitLeave}>
          <Form.Item name="leave_date" rules={[{ required: true }]}>
            <DatePicker placeholder="选择日期" />
          </Form.Item>
          <Form.Item name="leave_type" rules={[{ required: true }]} initialValue="annual">
            <Select style={{ width: 120 }}>
              <Select.Option value="annual">年假</Select.Option>
              <Select.Option value="sick">病假</Select.Option>
              <Select.Option value="personal">事假</Select.Option>
              <Select.Option value="comp">调休</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">提交</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}