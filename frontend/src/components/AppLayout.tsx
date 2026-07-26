import React from "react";
import { Layout, Menu, Button, theme } from "antd";
import {
  DashboardOutlined, TeamOutlined, BarChartOutlined,
  FieldNumberOutlined, CalendarOutlined,
  FileTextOutlined, LogoutOutlined, UserOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const { Header, Sider, Content } = Layout;

const schedulerMenuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "仪表盘" },
  { key: "/employees", icon: <TeamOutlined />, label: "员工管理" },
  { key: "/positions", icon: <TeamOutlined />, label: "岗位设置" },
  { key: "/forecasts", icon: <BarChartOutlined />, label: "业务量预测" },
  { key: "/hourly-requirements", icon: <FieldNumberOutlined />, label: "人力需求" },
  { key: "/schedule-board", icon: <CalendarOutlined />, label: "排班面板" },
  { key: "/leaves", icon: <FileTextOutlined />, label: "休假管理" },
  { key: "/adjustment-logs", icon: <BarChartOutlined />, label: "操作日志" },
];

const employeeMenuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "仪表盘" },
  { key: "/my-schedule", icon: <CalendarOutlined />, label: "我的排班" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const menuItems = user?.role === "scheduler" ? schedulerMenuItems : employeeMenuItems;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ height: 32, margin: 16, color: "#fff", fontWeight: "bold", fontSize: 16, textAlign: "center" }}>排班系统</div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header style={{ padding: "0 24px", background: colorBgContainer, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          <span style={{ marginRight: 16 }}><UserOutlined style={{ marginRight: 4 }} />{user?.name} ({user?.role === "scheduler" ? "排班员" : "员工"})</span>
          <Button type="text" icon={<LogoutOutlined />} onClick={logout}>退出</Button>
        </Header>
        <Content style={{ margin: 16 }}>
          <div style={{ padding: 16, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}