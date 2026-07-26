import React, { useEffect, useState } from "react";
import { Card, Table, Select, InputNumber, Button, Space, message, DatePicker, Tag, Modal, Input, Empty, Spin } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined, CalculatorOutlined } from "@ant-design/icons";
import api from "../api/client";
import dayjs from "dayjs";

export default function ProductivityMappingPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [calcDate, setCalcDate] = useState<dayjs.Dayjs>(dayjs());
  const [calcResults, setCalcResults] = useState<any[]>([]);
  const [calcLoading, setCalcLoading] = useState(false);

  // Editable mapping state
  const [editPosId, setEditPosId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editUnit, setEditUnit] = useState<string>("per_hour");

  useEffect(() => {
    api.get("/positions/").then(r => setPositions(r.data));
    loadMappings();
  }, []);

  const loadMappings = async () => {
    const res = await api.get("/productivity/mappings");
    setMappings(res.data);
  };

  const handleSave = async (mapping: any | null) => {
    try {
      if (mapping) {
        await api.put("/productivity/mappings/" + mapping.id, {
          productivity_value: editValue,
          unit: editUnit,
        });
      } else {
        await api.post("/productivity/mappings", {
          position_id: editPosId,
          productivity_value: editValue,
          unit: editUnit,
        });
      }
      message.success("已保存");
      setEditPosId(null);
      loadMappings();
    } catch (e: any) {
      message.error("保存失败: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete("/productivity/mappings/" + id);
      message.success("已删除");
      loadMappings();
    } catch (e: any) {
      message.error("删除失败");
    }
  };

  const handleCalculate = async () => {
    setCalcLoading(true);
    try {
      const res = await api.get("/productivity/calculate-all", {
        params: { date_str: calcDate.format("YYYY-MM-DD") },
      });
      setCalcResults(res.data.items || []);
    } catch (e: any) {
      message.error("计算失败: " + (e.response?.data?.detail || e.message));
    } finally {
      setCalcLoading(false);
    }
  };

  const getPositionName = (id: number) => {
    const p = positions.find(p => p.id === id);
    return p ? p.name : "未知岗位";
  };

  const mappingColumns = [
    { title: "岗位", dataIndex: "position_name", key: "pos" },
    { title: "产能值", dataIndex: "productivity_value", key: "val", render: (v: number) => v.toFixed(1) },
    { title: "单位", dataIndex: "unit", key: "unit", render: (u: string) => u === "per_hour" ? <Tag color="blue">业务量/人/小时</Tag> : <Tag color="green">业务量/人/班次</Tag> },
    { title: "操作", key: "action", render: (_: any, record: any) => (
      <Space>
        <Button type="link" icon={<EditOutlined />} onClick={() => {
          setEditPosId(record.position_id);
          setEditValue(record.productivity_value);
          setEditUnit(record.unit);
        }}>编辑</Button>
        <Button type="link" danger icon={<CloseOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
      </Space>
    )},
  ];

  const calcColumns = [
    { title: "岗位", dataIndex: "position_name", key: "pos" },
    { title: "当日业务量", dataIndex: "daily_volume", key: "vol" },
    { title: "产能值", dataIndex: "productivity_value", key: "pv", render: (v: number) => v.toFixed(1) },
    { title: "单位", dataIndex: "unit", key: "unit", render: (u: string) => <Tag>{u === "per_hour" ? "业务量/人/小时" : "业务量/人/班次"}</Tag> },
    { title: "需人力", dataIndex: "required_headcount", key: "hc", render: (v: number) => <strong>{v.toFixed(1)} 人</strong> },
  ];

  return (
    <div>
      <Card title="编辑业务量 - 人力映射" style={{ marginBottom: 16 }}>
        <p style={{ color: "#888", marginBottom: 12 }}>
          为每个岗位设定一人单位时间可处理的业务量。系统根据业务量预测自动计算所需人力。
        </p>

        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="选择岗位"
            style={{ width: 160 }}
            value={editPosId}
            onChange={(v) => {
              setEditPosId(v);
              const existing = mappings.find(m => m.position_id === v);
              if (existing) {
                setEditValue(existing.productivity_value);
                setEditUnit(existing.unit);
              } else {
                setEditValue(10);
                setEditUnit("per_hour");
              }
            }}
          >
            {positions.map((p: any) => (
              <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
            ))}
          </Select>
          <InputNumber
            placeholder="每人可处理业务量"
            min={0.1}
            step={0.5}
            value={editValue}
            onChange={(v) => setEditValue(v || 0)}
            style={{ width: 180 }}
          />
          <Select value={editUnit} onChange={setEditUnit} style={{ width: 160 }}>
            <Select.Option value="per_hour">业务量/人/小时</Select.Option>
            <Select.Option value="per_shift">业务量/人/班次</Select.Option>
          </Select>
          <Button type="primary" icon={<SaveOutlined />}
            onClick={() => {
              const existing = mappings.find(m => m.position_id === editPosId);
              handleSave(existing || null);
            }}
            disabled={!editPosId}
          >保存映射</Button>
        </Space>

        <Table dataSource={mappings} columns={mappingColumns} rowKey="id" size="small" pagination={false} />
      </Card>

      <Card title="计算人力需求" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <DatePicker value={calcDate} onChange={(v) => v && setCalcDate(v)} />
          <Button type="primary" icon={<CalculatorOutlined />} onClick={handleCalculate} loading={calcLoading}>
            计算当天人力需求
          </Button>
        </Space>

        {calcResults.length > 0 ? (
          <Table dataSource={calcResults} columns={calcColumns} rowKey="position_id" size="small" pagination={false} />
        ) : (
          calcLoading ? null : <Empty description="点击按钮计算当天人力需求" />
        )}
      </Card>
    </div>
  );
}
