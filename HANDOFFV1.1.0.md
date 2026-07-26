# 部门排班系统 V1.1.0 — 交接文档

## 任务目标

构建一个面向 20-100 人客服/服务中心的 Web 排班管理系统。  
V1.1.0 在 V1.0.0 基础上新增：文件导入月度预测 + 业务量→人力映射计算 + 按小时/周度视图 + 岗位时间段设置 + 管理员代填休假 + 排班透视表。

## 技术栈

- **后端**: Python (FastAPI) + SQLAlchemy (async) + SQLite
- **前端**: React 18 + TypeScript + Ant Design 5 + Vite
- **Auth**: JWT (python-jose + passlib)

## V1.1.0 新增/修改内容

### 排班周期 (Sat-Fri)
- 排班周期改为 **周六起始 → 周五结束**
- 每周六当周排班生效
- `ScheduleWeek.week_start` 注释同步修改

### 业务量预测 — 文件导入 + 趋势图
- 支持 CSV / .xlsx / .xls 文件上传 (`POST /api/forecasts/import`)
- 表头需包含: `position_id` 或 `position_name`, `date`, `daily_volume`
- 趋势图组件: SVG 折线图, 多岗位分色显示, 图例, 关键日期标注(可添加/删除)
- 测试数据: `D:\codex\scheduling-system\测试数据_月度预测.csv`

### 业务量→人力映射 (ProductivityMapping)
- 新增模型: `ProductivityMapping` (position_id, productivity_value, unit: per_hour|per_shift)
- CRUD API: `GET/POST/PUT/DELETE /api/productivity/mappings`
- 计算 API: `GET /api/productivity/calculate-all?date_str=...`
- 批量计算: `GET /api/productivity/calculate-range?start_date=...&end_date=...`
- 每小时明细: `GET /api/productivity/calculate-hourly?date_str=...`
- 计算逻辑: `required = ceil(daily_volume / (productivity_value × slot_hours))`
- 每人工作 8h, 总工时 = required × 8, 均匀分配到岗位时间段各小时

### 岗位时间段 (PositionTimeSlot)
- 新增模型: `PositionTimeSlot` (position_id, start_hour, end_hour)
- CRUD API: `/api/position-timeslots/`
- 所有岗位可一次性编辑, 设置后计算自动按时间段分配人力
- Gantt 图预览: 岗位 × 时间分布

### 人力需求页面 (HourlyRequirementPage)
重构为三 Tab:

| Tab | 说明 |
|-----|------|
| 明细列表 | 原始 hourly_requirements 数据 |
| 按小时视图 | 岗位 × 0:00-24:00(每30min一格) 交叉表, 数据来自 calculate-hourly API |
| 周度汇总 | 岗位 × 日期(一周7天) 交叉表, 可左右翻周, 底部汇总行 |

### 休假管理 — 管理员代填
- `LeaveRequest` 新增 `creator_type`(employee|scheduler) 和 `creator_id` 字段
- 排班员可代员工填写休假 → 自动写入 `AdjustmentLog` 审计
- 表格新增"来源"列(员工自填/排班员代填)

### 排班面板 (ScheduleBoardPage)
- 改为**透视表**: 横轴=日期(周六-周五), 竖轴=员工, 单元格=班次
- 所有员工(含无排班的)均显示, 无排班日显示"休"
- 多岗位同一天以多 Tag 分色显示
- 警告标记: 有警告的 Tag 显示红色边框 + ⚠ 图标 + 详情 Tooltip
- 警告列表: 表格上方 Alert 列出每条警告的具体内容

### 排班引擎修复
- 修复 `time(hour=24)` 超范围崩溃 → 改为 `min(..., 23)`
- 支持按已有周重新生成(先删旧数据再创建)
- 修复 `CoverageGap.position_name` 缺失导致的 Pydantic 验证错误

### 其他
- 修复 seed.py 员工技能赋值错误(Position→Skill)
- 修复 bcrypt 兼容性问题(安装 bcrypt<4.1)
- 移除所有 Python 文件的 UTF-8 BOM

## 数据模型

```
Employee ──┬── PrimaryPosition → Position
           └── Skills → Skill (through employee_skills)
Position ──┬── RequiredSkills → Skill (through position_skills)
           ├── ProductivityMapping (1:1)
           └── PositionTimeSlot (1:1)
MonthlyForecast (position_id, date, daily_volume)
HourlyRequirement (position_id, date, hour, required_headcount)
LeaveRequest (employee_id, leave_date, type, status, creator_type, creator_id)
ShiftAssignment (employee_id, position_id, date, shift_start, shift_end)
ScheduleWeek (week_start, status)
AdjustmentLog (operator_id, change_detail)
```

## API 端点汇总

### V1.1.0 新增
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/productivity/mappings` | GET/POST/PUT/DELETE | 人力映射 CRUD |
| `/api/productivity/calculate-all` | GET | 计算单天所有岗位人力 |
| `/api/productivity/calculate-range` | GET | 计算日期范围人力 |
| `/api/productivity/calculate-hourly` | GET | 计算每小时人力分布 |
| `/api/position-timeslots/` | GET/POST/PUT/DELETE | 岗位时间段 CRUD |
| `/api/forecasts/import` | POST | 文件导入预测 |

## 启动方式

### 终端 1 — 后端
```powershell
cd D:\codex\scheduling-system\backend
python.exe -m pip install -r requirements.txt
python.exe seed.py
python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 终端 2 — 前端
```powershell
cd D:\codex\scheduling-system\frontend
node.exe node_modules\vite\bin\vite.js --port 5173
```

> 注意: 使用工具包自带的 python/node, 路径参考 `C:\Users\abc\.cache\codex-runtimes\codex-primary-runtime\dependencies\`

### 测试账号
| 角色 | 邮箱 | 密码 |
|------|------|------|
| 排班员 | admin@test.com | admin123 |
| 员工 | zhangsan@test.com | 123456 |

## 当前问题

1. **拖拽微调未实现**: 排班面板只有生成和展示, 不支持拖拽调整班次
2. **能力项数据显示**: 岗位列表的「需求能力」列显示异常(需后端返回 skill 字段)
3. **员工数量不足**: 当前仅 6 名员工, 排班时覆盖缺口 23 个(需补充员工或调整班次需求)
4. **跨夜班次不支持**: `time(hour=24)` 限制导致 22:00+8h 的班次截断到 23:00
5. **排班引擎员工排满后不再分配**: 同一员工可跨岗位情况未充分利用(技能体系仅校验不排配)
6. **排班面板没有拖拽修改功能**

## 下一步计划

1. 排班面板拖拽调整: 点击单元格弹出班次编辑
2. 岗位列表补全需求能力列
3. 跨夜班次支持
4. Excel/PDF 导出
5. 员工班次偏好表达、换班申请
6. 积累业务量数据后优化换算模型

## V1.1.0 踩过的坑

### 1. time(hour=24) 崩溃
**现象**: 排班生成报 500 Internal Server Error  
**原因**: 引擎 `min(slot_hour + 8, 24)` 生成 24, `time(hour=24)` 超出 Python 0-23 范围  
**修复**: 改为 `min(..., 23)`  
**教训**: 使用 `time()` 构造函数前检查 hour 范围

### 2. CoverageGap 缺少 position_name
**现象**: Pydantic validation error: "Field required: position_name"  
**原因**: 引擎返回的缺口数据不含 position_name, 但 CoverageGap schema 要求该字段  
**修复**: 路由层从数据库查询 position_name 后补全  
**教训**: 新加 schema 字段时要确保所有数据来源都包含该字段

### 3. 重新生成已有周报错
**现象**: 对已有排班的周再次生成报 500  
**原因**: ScheduleWeek.week_start 唯一约束, 直接插入冲突  
**修复**: 生成前先查是否存在, 存在则删旧数据再创建  
**教训**: upsert 操作要先检查唯一约束

### 4. seed.py 员工技能赋值错误
**现象**: FlushError: "Expected Skill, got Position"  
**原因**: `emp.skills = [positions[s] for s in skills]` 把 Position 赋给了 Skill 关系  
**修复**: 创建 Skill 对象并用 pos_to_skill 映射  
**教训**: 多对多关系赋值前确认目标实体类型

### 5. 异步 SQLAlchemy 懒加载
**现象**: `MissingGreenlet` 错误  
**原因**: async 模式下访问未预加载的关联属性  
**修复**: 加 `.options(selectinload(Model.relationship))`  
**始终注意**: 所有 async 查询涉及关联都要预加载

### 6. bcrypt 版本不兼容
**现象**: `ValueError: password cannot be longer than 72 bytes`  
**原因**: bcrypt 5.0.0 与 passlib 不兼容  
**修复**: `pip install "bcrypt<4.1"`
