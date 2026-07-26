import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Select, Space, Tag, message } from "antd";
import api from "../api/client";

const { Option } = Select;

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [skillEmpId, setSkillEmpId] = useState<number | null>(null);
  const [skillEmpName, setSkillEmpName] = useState("");
  const [empSkills, setEmpSkills] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      const [empRes, posRes, skillRes] = await Promise.all([
        api.get("/employees/"),
        api.get("/positions/"),
        api.get("/skills/"),
      ]);
      setEmployees(empRes.data);
      setPositions(posRes.data);
      setAllSkills(skillRes.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      await api.post("/employees/", {
        name: values.name,
        email: values.email,
        password: values.password || "123456",
        role: "employee",
        primary_position_id: values.primary_position_id,
      });
      message.success("员工添加成功");
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e: any) {
      message.error("添加失败: " + (e.response?.data?.detail || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  const openSkillEdit = async (record: any) => {
    setSkillEmpId(record.id);
    setSkillEmpName(record.name);
    try {
      const res = await api.get("/skills/employees/" + record.id);
      setEmpSkills(res.data.skill_ids || []);
    } catch {
      setEmpSkills([]);
    }
    setSkillModalOpen(true);
  };

  const handleSkillSave = async () => {
    if (!skillEmpId) return;
    try {
      await api.put("/skills/employees/" + skillEmpId, { skill_ids: empSkills });
      message.success("能力已更新");
      setSkillModalOpen(false);
      load();
    } catch (e: any) {
      message.error("更新失败: " + (e.response?.data?.detail || e.message));
    }
  };

  const columns = [
    { title: "姓名", dataIndex: "name", key: "name" },
    { title: "邮箱", dataIndex: "email", key: "email" },
    { title: "主岗位", dataIndex: "primary_position_name", key: "pos" },
    { title: "角色", dataIndex: "role", key: "role", render: (r: string) => r === "scheduler" ? <Tag color="blue">排班员</Tag> : <Tag>员工</Tag> },
    { title: "调休池(h)", dataIndex: "comp_time_balance", key: "comp" },
    { title: "本周工时", dataIndex: "weekly_hours", key: "wh" },
    { title: "状态", dataIndex: "is_active", key: "active", render: (a: number) => a ? <Tag color="green">在职</Tag> : <Tag color="red">离职</Tag> },
    {
      title: "具备能力",
      key: "skills",
      render: (_: any, record: any) => {
        const skillNames = allSkills.filter(s => record.skill_ids?.includes(s.id)).map(s => s.name);
        return skillNames.length > 0
          ? skillNames.map((n: string) => <Tag key={n}>{n}</Tag>)
          : <Tag color="orange">未设置</Tag>;
      },
    },
    {
      title: "操作",
      key: "action",
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => openSkillEdit(record)}>编辑能力</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => { setEditingEmp(null); form.resetFields(); setModalOpen(true); }}>添加员工</Button>
      </div>
      <Table dataSource={employees} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
      <Modal title="添加员工" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: "请输入姓名" }]}>
            <Input placeholder="姓名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: "请输入邮箱" }]}>
            <Input placeholder="邮箱" />
          </Form.Item>
          <Form.Item name="primary_position_id" label="主岗位" rules={[{ required: true, message: "请选择岗位" }]}>
            <Select placeholder="选择岗位">
              {positions.map((p: any) => <Option key={p.id} value={p.id}>{p.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="password" label="密码" extra="默认密码: 123456">
            <Input.Password placeholder="留空使用默认密码" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>保存</Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={"编辑能力 - " + skillEmpName} open={skillModalOpen} onCancel={() => setSkillModalOpen(false)} onOk={handleSkillSave}>
        <Select mode="multiple" style={{ width: "100%" }} placeholder="选择已具备的能力" value={empSkills} onChange={setEmpSkills}>
          {allSkills.map((s: any) => <Option key={s.id} value={s.id}>{s.name}</Option>)}
        </Select>
        <div style={{ marginTop: 8, color: "#999" }}>每人至少需要 1 项能力</div>
      </Modal>
    </div>
  );
}