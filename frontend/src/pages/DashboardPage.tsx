import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Table, Tag, Spin } from "antd";
import { TeamOutlined, CalendarOutlined, WarningOutlined } from "@ant-design/icons";
import api from "../api/client";
import dayjs from "dayjs";
import { useAuth } from "../contexts/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ employees: 0, pendingLeaves: 0, weekAssignments: 0, warnings: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, leaveRes] = await Promise.all([
          api.get("/employees/").catch(() => ({ data: [] })),
          api.get("/leaves/").catch(() => ({ data: [] })),
        ]);
        const pendingLeaves = leaveRes.data.filter((l: any) => l.status === "pending").length;
        setStats(s => ({ ...s, employees: empRes.data.length, pendingLeaves }));
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card><Statistic title="总人数" value={stats.employees} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="待审休假" value={stats.pendingLeaves} prefix={<CalendarOutlined />} valueStyle={{ color: "#faad14" }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="本周排班" value={stats.weekAssignments} prefix={<CalendarOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="违规警告" value={stats.warnings} prefix={<WarningOutlined />} valueStyle={{ color: "#ff4d4f" }} /></Card>
        </Col>
      </Row>
      {user?.role === "scheduler" && (
        <Card title="快速操作">
          <p>欢迎使用排班系统。请按以下流程操作：</p>
          <ol>
            <li>录入 <strong>月度业务量预测</strong> — 设定未来每日每岗位的业务量</li>
            <li>设定 <strong>每小时人力需求</strong> — 根据业务量换算各时段需到岗人数</li>
            <li>确认员工 <strong>休假/不可用时段</strong> 已提交</li>
            <li>进入 <strong>排班面板</strong> 生成并调整排班</li>
            <li>确认发布：下周终版 + 下下周预排草案</li>
          </ol>
        </Card>
      )}
      {user?.role === "employee" && (
        <Card title="我的排班">
          <p>请前往「我的排班」查看下周班表，或提交休假申请与不可用时段。</p>
        </Card>
      )}
    </div>
  );
}