import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Select, Space, Tag, message, Popconfirm } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import api from "../api/client";

const { Option } = Select;

export default function PositionManagementPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<any>(null);
  const [editPosId, setEditPosId] = useState<number | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [posRes, skillRes] = await Promise.all([
        api.get("/positions/"),
        api.get("/skills/"),
      ]);
      setPositions(posRes.data);
      setAllSkills(skillRes.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (values: any) => {
    try {
      let posId: number;
      if (editingPos) {
        await api.put("/positions/" + editingPos.id, values);
        posId = editingPos.id;
      } else {
        const res = await api.post("/positions/", values);
        posId = res.data.id;
      }
      // Save required skills
      await api.put("/skills/positions/" + posId, { skill_ids: selectedSkills });
      message.success(editingPos ? "岗位已更新" : "岗位已创建");
      setModalOpen(false);
      form.resetFields();
      setSelectedSkills([]);
      load();
    } catch (e: any) {
      message.error("操作失败: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete("/positions/" + id);
      message.success("岗位已删除");
      load();
    } catch (e: any) {
      message.error("删除失败: " + (e.response?.data?.detail || e.message));
    }
  };

  const openEdit = async (record: any) => {
    setEditingPos(record);
    setEditPosId(record.id);
    form.setFieldsValue(record);
    try {
      const res = await api.get("/skills/positions/" + record.id);
      setSelectedSkills(res.data.skill_ids || []);
    } catch {
      setSelectedSkills([]);
    }
    setModalOpen(true);
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "岗位名称", dataIndex: "name", key: "name" },
    { title: "描述", dataIndex: "description", key: "description" },
        {
      title: "需求能力",
      key: "skills",
      render: (_: any, record: any) => {
        const skillNames = allSkills.filter(s => record._skill_ids?.includes(s.id)).map(s => s.name);
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
          <Button size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingPos(null); form.resetFields(); setSelectedSkills([]); setModalOpen(true); }}>添加岗位</Button>
      </div>
      <Table dataSource={positions} columns={columns} rowKey="id" loading={loading} />
      <Modal title={editingPos ? "编辑岗位" : "添加岗位"} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="岗位名称" rules={[{ required: true, message: "请输入岗位名称" }]}>
            <Input placeholder="如: 投诉组、咨询组、销售组" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="岗位职责描述（选填）" rows={3} />
          </Form.Item>
          <Form.Item label="需求能力项（勾选该岗位要求的能力）">
            <Select mode="multiple" placeholder="选择能力项" value={selectedSkills} onChange={setSelectedSkills}>
              {allSkills.map((s: any) => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}