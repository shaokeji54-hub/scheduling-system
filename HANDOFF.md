# 部门排班系统 — 交接文档

## 任务目标

构建一个面向 20-100 人客服/服务中心的 Web 排班管理系统。
以**每周为周期**运行：排班员按月录入业务量预测 → 换算为每小时人力需求 → 结合员工休假与不可用时段 → 在硬性法律约束内自动生成排班方案 → 手工微调后输出下周终版 + 下下周预排草案。

## 已完成内容

### 后端 (FastAPI + SQLAlchemy + SQLite)

| 模块 | 说明 |
|------|------|
| 数据模型 | Employee, Position, Skill, MonthlyForecast, HourlyRequirement, LeaveRequest, UnavailableTime, ShiftAssignment, ScheduleWeek, AdjustmentLog |
| 排班算法 | SchedulingEngine — 贪心分配 + 硬约束（>6天无休、>11h/天、>36h/月加班） + 建议规则标注（=6天、<11h间隔、>30h加班） |
| 认证 | JWT 登录，scheduler / employee 两角色 |
| API | 完整 CRUD：员工、岗位、技能、预测、人力需求、排班、休假、不可用时段、操作日志 |
| 技能体系 | Skill 独立实体，岗位关联「需求能力项」，员工关联「已具备能力」，排班时校验能力匹配 |

### 前端 (React + Ant Design + Vite)

| 页面 | 角色 | 功能 |
|------|------|------|
| 登录页 | 公共 | 登录 + 员工注册弹窗 |
| 仪表盘 | 全部 | 概览统计 |
| 员工管理 | 排班员 | 员工 CRUD + 编辑能力 |
| 岗位设置 | 排班员 | 岗位 CRUD + 设置需求能力项 |
| 业务量预测 | 排班员 | 录入/查询每日每岗位预估业务量 |
| 人力需求 | 排班员 | 设定每岗位每小时的需到岗人数 |
| 排班面板 | 排班员 | 生成排班 + 拖拽调整 + 终版/草案状态 |
| 休假管理 | 排班员 | 审批员工休假（含预检反馈） |
| 我的排班 | 员工 | 查看班表 + 提交休假/不可用 |
| 操作日志 | 排班员 | 变更审计 |

### 规则体系

- **硬性规则**（算法不产出违规方案）：连续工作 >6 天 / 当日工时 >11h / 当月加班 >36h
- **建议规则**（标注 ⚠️）：连续工作 =6 天 / 班次间隔 <11h / 当月加班 >30h
- **工时管理**：周基准 40h，超出部分入调休池，月底结算加班时数
- **两次反馈**：员工提交休假时实时预检可行性 → 排班时确认最终结果并反馈原因

## 当前问题

1. **月度业务量预测页面**（ForecastPage）刚重写完成，待用户验证
2. **排班面板的拖拽调整功能**尚未实现（目前只有生成和展示）
3. **能力项数据显示**：岗位列表的「需求能力」列暂时无法显示（需后端返回 _skill_ids 字段）
4. **业务量→人力的自动换算**尚未实现（排班员手动换算）

## 启动方式

两个终端分别运行：

### 终端 1 — 后端
```powershell
cd D:\codex\scheduling-system\backend
python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
> 注意：用工具包自带的 Python，路径参考前端页面的 `node.exe` 同级目录下的 `python.exe`

### 终端 2 — 前端
```powershell
cd D:\codex\scheduling-system\frontend
node.exe node_modules\vite\bin\vite.js --port 5173
```

### 测试账号
| 角色 | 邮箱 | 密码 |
|------|------|------|
| 排班员 | admin@test.com | admin123 |
| 员工 | zhangsan@test.com | 123456 |

## 踩过的坑

### 1. 异步 SQLAlchemy 懒加载问题
**现象**：访问 `emp.primary_position.name` 或 `emp.skills` 等关联属性时抛 `MissingGreenlet` 错误。
**原因**：异步模式下懒加载需要 greenlet 上下文，直接访问关联属性会失败。
**解决**：查询时加 `.options(selectinload(Model.relationship))` 预加载。
**涉及文件**：`employee_router.py`、`skill_router.py`、种子脚本

### 2. 数据库连接错乱
**现象**：种子脚本连接 PostgreSQL 而非 SQLite。
**原因**：`.env` 文件不在当前工作目录，pydantic-settings 读不到配置。
**解决**：在 `backend/` 目录下运行脚本，或显式设置 `DATABASE_URL` 环境变量。

### 3. PowerShell 编码问题
**现象**：`Get-Content` 显示的中文为乱码（如"濮撳悕"），但文件实际编码正确。
**原因**：Windows 终端默认编码不是 UTF-8。
**解决**：用 `python -c "print(open(path).read())"` 查看实际内容。

### 4. Vite 端口绑定问题
**现象**：浏览器无法访问 `localhost:5173`，显示连接拒绝。
**原因**：Vite 默认监听 IPv6 `::1`，浏览器走 IPv4 `127.0.0.1`。
**解决**：配置 `vite.config.ts` 中 `server.host: "0.0.0.0"`。

### 5. 系统命令不在 PATH 中
**现象**：`node`、`python`、`pnpm` 等命令找不到。
**原因**：开发环境使用工具包自带的运行时，而非系统安装。
**解决**：使用完整路径调用。

### 6. 沙箱安全策略拦截
**现象**：几乎所有文件写入和网络操作被拦截。
**原因**：Codex 的沙箱策略限制文件修改权限。
**解决**：通过 `require_escalated` 申请临时权限，或让用户手动操作文件。

## 下一步计划

1. 验证月度业务量预测页面的录入功能
2. 补全岗位列表的「需求能力」列显示
3. 实现排班面板的拖拽微调
4. 增加 Excel/PDF 导出功能
5. 积累业务量数据后，训练自动换算模型
6. 员工班次偏好表达、换班申请等扩展功能
