# 部门排班系统

面向 20-100 人客服/服务中心的 Web 排班管理系统。

## 技术栈

- **Backend**: Python (FastAPI) + SQLAlchemy (async) + PostgreSQL
- **Frontend**: React + TypeScript + Ant Design + Vite
- **Auth**: JWT (python-jose + passlib)

## 快速启动

### 1. 数据库

确保 PostgreSQL 运行，创建数据库：

```sql
CREATE DATABASE scheduling;
```

修改 `backend/.env` 配置数据库连接。

### 2. 后端

```powershell
cd backend
pip install -r requirements.txt
python seed.py          # 初始化种子数据
uvicorn app.main:app --reload --port 8000
```

### 3. 前端

```powershell
cd frontend
pnpm install
pnpm run dev
```

访问 http://localhost:5173

## 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 排班员 | admin@test.com | admin123 |
| 员工 | zhangsan@test.com | 123456 |

## 排班周期

- **周四截止**: 员工提交休假/不可用时段
- **周五**: 排班员生成下周排班 + 下下周预排草案
- **周一**: 当周排班生效

## 法律约束

硬性规则（算法不产生违规方案）:
- 连续工作 >6 天无休息
- 当日工时 >11h
- 当月加班 >36h

建议规则（标注 ⚠️，方案可出）:
- 连续工作 =6 天
- 当月加班 >30h
- 班次间隔 <11h
