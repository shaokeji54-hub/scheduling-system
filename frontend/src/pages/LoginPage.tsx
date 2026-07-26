import React, { useState } from "react";
import { Card, Form, Input, Button, message, Modal, Select, Space } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/client";

const { Option } = Select;

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [regOpen, setRegOpen] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [regForm] = Form.useForm();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success("登录成功");
    } catch {
      message.error("用户名或密码错误");
    } finally {
      setLoading(false);
    }
  };

  const openRegister = async () => {
    try {
      const res = await api.get("/positions/");
      setPositions(res.data);
    } catch {}
    setRegOpen(true);
  };

  const handleRegister = async (values: any) => {
    setRegLoading(true);
    try {
      await api.post("/employees/", {
        name: values.name,
        email: values.email,
        password: values.password,
        role: "employee",
        primary_position_id: values.primary_position_id,
      });
      message.success("注册成功，请登录");
      setRegOpen(false);
      regForm.resetFields();
    } catch (e: any) {
      message.error("注册失败: " + (e.response?.data?.detail || e.message));
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f0f2f5" }}>
      <Card title="部门排班系统" style={{ width: 420 }}>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="email" rules={[{ required: true, message: "请输入邮箱" }]}>
            <Input prefix={<UserOutlined />} placeholder="邮箱" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
          </Form.Item>
          <Form.Item style={{ textAlign: "center", marginBottom: 0 }}>
            <Button type="link" onClick={openRegister}>没有账号? 注册新员工</Button>
          </Form.Item>
        </Form>
      </Card>

      <Modal title="员工注册" open={regOpen} onCancel={() => setRegOpen(false)} footer={null} destroyOnClose>
        <Form form={regForm} layout="vertical" onFinish={handleRegister}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: "请输入姓名" }]}>
            <Input placeholder="真实姓名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: "请输入邮箱" }, { type: "email", message: "格式不正确" }]}>
            <Input placeholder="邮箱(登录名)" />
          </Form.Item>
          <Form.Item name="primary_position_id" label="主岗位" rules={[{ required: true, message: "请选择岗位" }]}>
            <Select placeholder="选择你的岗位">
              {positions.map((p: any) => <Option key={p.id} value={p.id}>{p.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: "密码至少6位" }]}>
            <Input.Password placeholder="设置密码" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={regLoading}>注册</Button>
              <Button onClick={() => setRegOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
