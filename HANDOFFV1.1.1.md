# 部门排班系统 V1.1.1 — 交接文档

## 任务目标

构建一个面向 20-100 人客服/服务中心的 Web 排班管理系统。
V1.1.1 在 V1.1.0 基础上：
- 修复 8 个前后端 Bug
- 新增排班面板点击编辑班次
- 补充员工种子数据 6 人→18 人，附带跨岗技能
- 引擎按技能跨岗位分配（gap-aware 排序）
- 支持跨夜班次（如 17:00-01:00）

## 技术栈

- 后端: Python (FastAPI) + SQLAlchemy (async) + SQLite
- 前端: React 18 + TypeScript + Ant Design 5 + Vite
- Auth: JWT (python-jose + passlib)

## 已完成内容

### 修复类

| 问题 | 文件 | 修复 |
|------|------|------|
| Position 列表不返回 skill_ids | position_router.py, schemas/position.py | selectinload 预加载 + 返回 skill_ids |
| CoverageGap.date 类型不一致 | engine.py | 引擎返回 date 对象而非 str |
| 小时人力分布错误 | productivity_mapping_router.py | base+extra 均匀分布 |
| ScheduleWeek 注释标"周一" | models/schedule.py | 改为"周六" |
| config.py 默认 PostgreSQL | config.py | 默认 sqlite+aiosqlite |
| 排班引擎包含管理员 | scheduler_service.py | 过滤 Employee.role == "employee" |
| 前端 setEditingEmp 未声明 | EmployeeManagementPage.tsx | 补全 state 声明 |
| 前端拒绝休假不传原因 | LeaveManagementPage.tsx | 传入 rejection_reason |
| 前端用 record._skill_ids | PositionManagementPage.tsx | 改为 record.skill_ids |

### 功能新增

| 功能 | 说明 |
|------|------|
| 排班面板点击编辑 | 每个单元格可点击，弹窗操作：编辑时间/调岗/删除/添加班次 |
| 跨夜班次支持 | 引擎自动计算 end_hour>24 的班次，模型加 is_overnight 字段，前端显示🌙(+1) |
| 按技能跨岗分配 | 引擎优先把多技能员工分配到缺口最大的岗位 |
| 18 名种子员工 | 含跨岗技能分配，预测业务量同步调高 |
| 演示数据脚本 | seed_demo.py 一键写入 ProductivityMapping/TimeSlot/Forecast/HourlyRequirement |

### 数据模型变更

ShiftAssignment 新增字段：
```python
is_overnight = Column(Integer, default=0)  # 是否跨夜班次
```

PositionResponse 新增字段：
```python
skill_ids: list[int] = []
```

## 当前问题

### 已知 Bug / 限制

1. **拖拽微调未实现**: 排班面板只有点击编辑弹窗，不支持拖拽调整
2. **跨夜班次日期处理**: 跨夜班次的 coverage 计算覆盖当日+次日凌晨，但第二天的人力缺口计算尚未联动（次日凌晨的需求如果已排人就不计入 gaps）
3. **员工数量仍然偏少**: 18 人 vs 3 岗位 320 件/天的咨询量仍有 60 个覆盖缺口
4. **无 Excel/PDF 导出**
5. **无 E2E 测试**（仅有 API 集成测试）
6. **技能体系仅支持跨岗分配，不支持换班申请**
7. **种子数据不可重复跑**: 第二次运行 seed_demo.py 会因 UNIQUE 约束报错（数据已存在）
8. **delete_assignment 端点无需鉴权**: 后端 DELETE 未验证调用者身份

### 性能参考

- 排班生成 < 200ms（18 员工, 3 岗位, 7 天）
- 108 个班次分配, 27 个跨夜班次, 8 人跨岗
- 60 个覆盖缺口

## 启动方式

### 首次启动

```powershell
# 终端 1 — 后端
cd D:\codex\scheduling-system\backend
python.exe -m pip install -r requirements.txt

# 清库重建
Remove-Item scheduling.db -Force
python.exe seed.py
python.exe seed_demo.py

# 启动后端
python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 终端 2 — 前端
cd D:\codex\scheduling-system\frontend
node.exe node_modules\vite\bin\vite.js --port 5173
```

### 重新启动（已有数据）

```powershell
# 终端 1
python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 终端 2
node.exe node_modules\vite\bin\vite.js --port 5173
```

### 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 排班员 | admin@test.com | admin123 |
| 员工 | zhangsan@test.com | 123456 |

## 目录结构

```
scheduling-system/
├── HANDOFF.md
├── HANDOFFV1.1.0.md
├── HANDOFFV1.1.1.md          # ← 本文件
├── README.md
├── 测试数据_月度预测.csv
├── backend/
│   ├── .env                   # DATABASE_URL=sqlite+aiosqlite:///./scheduling.db
│   ├── requirements.txt
│   ├── seed.py                # 基础种子（员工/岗位/技能）
│   ├── seed_demo.py           # 演示数据（预测/映射/时段/人力需求）
│   ├── test_api.py            # API 集成测试
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/            # SQLAlchemy ORM 模型
│       ├── schemas/           # Pydantic 请求/响应模型
│       ├── routers/           # FastAPI 路由
│       ├── services/          # 业务逻辑（Auth, SchedulerService）
│       └── scheduler/
│           └── engine.py      # 排班引擎（核心算法）
└── frontend/
    ├── vite.config.ts
    └── src/
        ├── api/client.ts
        ├── pages/             # 页面组件
        └── components/        # 布局组件
```

## 核心数据流

```
MonthlyForecast (业务量预测)
        ↓
ProductivityMapping (业务量→人力映射)
PositionTimeSlot (岗位时间段)
        ↓  calculate-all / calculate-hourly
HourlyRequirement (每小时需到岗人数)
        ↓
SchedulingEngine.generate()
        ↓
ShiftAssignment (班次分配) + ScheduleWeek (周排班)
        ↓
ScheduleBoardPage (排班面板透视表)
```

## 踩过的坑

### 1. time(hour=24) 崩溃
现象：排班生成报 500 Internal Server Error
原因：引擎 `min(slot_hour + 8, 24)` 生成 24，`time(hour=24)` 超出 Python 0-23 范围
修复：改为计算 raw_end > 24 时自动 wrap 到次日，新增 is_overnight 标记
教训：使用 time() 构造函数前检查 hour 范围，或用 timedelta 替代

### 2. CoverageGap 缺少 position_name
现象：Pydantic validation error: "Field required: position_name"
原因：引擎返回的缺口数据不含 position_name，但 CoverageGap schema 要求
修复：路由层从数据库查询 position_name 后补全
教训：新加 schema 字段时要确保所有数据来源都包含该字段

### 3. 重新生成已有周报错
现象：对已有排班的周再次生成报 500
原因：ScheduleWeek.week_start 唯一约束，直接插入冲突
修复：生成前先查是否存在，存在则删旧数据再创建
教训：upsert 操作要先检查唯一约束

### 4. seed.py 员工技能赋值错误
现象：FlushError: "Expected Skill, got Position"
原因：emp.skills = [positions[s] for s in skills] 把 Position 赋给了 Skill 关系
修复：创建 Skill 对象并用 pos_to_skill 映射
教训：多对多关系赋值前确认目标实体类型

### 5. 异步 SQLAlchemy 懒加载
现象：MissingGreenlet 错误
原因：async 模式下访问未预加载的关联属性
修复：加 .options(selectinload(Model.relationship))
教训：所有 async 查询涉及关联都要预加载

### 6. bcrypt 版本不兼容
现象：ValueError: password cannot be longer than 72 bytes
原因：bcrypt 5.0.0 与 passlib 不兼容
修复：pip install "bcrypt<4.1"

### 7. 数据库文件被进程锁定 (V1.1.1 新增)
现象：Delete-Item 报"文件正由另一进程使用"；seed.py 报 UNIQUE constraint
原因：后台运行的 uvicorn 进程持有 scheduling.db 文件锁
修复：先 Stop-Process Python 进程，再删除 DB 文件，最后重新 seed
教训：操作数据库文件前先检查/停止持有该文件的进程

### 8. 前端使用未声明的 state (V1.1.1 新增)
现象：点击"添加员工"按钮无响应或有运行时错误
原因：onClick 中引用了 setEditingEmp 但从未用 useState 声明
修复：补全 const [editingEmp, setEditingEmp] = useState<any>(null)
教训：React 组件中任何 setXxx 都必须有对应的 useState 声明

### 9. 前端后端字段名不一致 (V1.1.1 新增)
现象：岗位列表的"需求能力"列始终显示"未设置"
原因：前端用 record._skill_ids 访问，但后端返回字段名是 skill_ids（无下划线前缀）
修复：前端改为 record.skill_ids
教训：前后端约定字段名后，修改任一方都要同步更新另一方

### 10. 正则替换导致 Python 语法错误 (V1.1.1 新增)
现象：PowerShell 正则替换 schedule_router.py 后生成 )is_overnight=a.is_overnight,) 无效代码
原因：一次替换多行的正则匹配了错误的边界
修复：放弃正则，直接重写整个文件
教训：多文件批量修改用全量重写 + tsc --noEmit 验证，比局部正则更安全
