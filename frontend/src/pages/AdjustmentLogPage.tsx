import React, { useEffect, useState } from "react";
import { Table, Tag } from "antd";
import api from "../api/client";

export default function AdjustmentLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/adjustment-logs/").then(r => { setLogs(r.data); }).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: "操作人", dataIndex: "operator_name", key: "op" },
    { title: "变更内容", dataIndex: "change_detail", key: "detail" },
    { title: "原因", dataIndex: "reason", key: "reason" },
    { title: "时间", dataIndex: "created_at", key: "time" },
  ];

  return <Table dataSource={logs} columns={columns} rowKey="id" loading={loading} size="small" />;
}