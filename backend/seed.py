"""Seed data script."""

import asyncio, sys
sys.path.insert(0, r'D:\codex\scheduling-system\backend')
from app.database import engine, Base, async_session
from app.models import *
from app.services.auth import AuthService

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as db:
        from app.models.skill import Skill
        from app.models.employee_skill import employee_skills
        positions = {}
        for name in ['投诉组', '咨询组', '销售组']:
            pos = Position(name=name, description=name)
            db.add(pos)
            await db.flush()
            positions[name] = pos
        skills = {}
        for name in ['投诉处理能力', '咨询解答能力', '销售转化能力']:
            sk = Skill(name=name, description=name)
            db.add(sk)
            await db.flush()
            skills[name] = sk
        admin = Employee(
            name='管理员', email='admin@test.com',
            hashed_password=AuthService.hash_password('admin123'),
            role='scheduler', primary_position_id=positions['投诉组'].id,
        )
        db.add(admin)
        employees = [
            ('张三', 'zhangsan@test.com', '投诉组', ['咨询组']),
            ('李四', 'lisi@test.com', '投诉组', []),
            ('王五', 'wangwu@test.com', '咨询组', ['销售组']),
            ('赵六', 'zhaoliu@test.com', '咨询组', []),
            ('孙七', 'sunqi@test.com', '销售组', ['投诉组']),
            ('周八', 'zhouba@test.com', '销售组', []),
            ('吴九', 'wujiu@test.com', '投诉组', ['咨询组', '销售组']),
            ('郑十', 'zhengshi@test.com', '咨询组', ['投诉组']),
            ('陈晓', 'chenxiao@test.com', '销售组', ['咨询组']),
            ('林琳', 'linlin@test.com', '投诉组', []),
            ('黄明', 'huangming@test.com', '咨询组', ['投诉组', '销售组']),
            ('杨芳', 'yangfang@test.com', '销售组', []),
            ('刘强', 'liuqiang@test.com', '投诉组', ['销售组']),
            ('何丽', 'heli@test.com', '咨询组', []),
            ('马超', 'machao@test.com', '销售组', ['投诉组', '咨询组']),
            ('高远', 'gaoyuan@test.com', '投诉组', []),
            ('宋佳', 'songjia@test.com', '咨询组', ['销售组']),
            ('唐亮', 'tangliang@test.com', '销售组', ['咨询组']),
        ]
        for name, email, pos_name, skill_names in employees:
            emp = Employee(
                name=name, email=email,
                hashed_password=AuthService.hash_password('123456'),
                role='employee', primary_position_id=positions[pos_name].id,
            )
            pos_to_skill = {'投诉组': '投诉处理能力', '咨询组': '咨询解答能力', '销售组': '销售转化能力'}
            emp.skills = [skills[pos_to_skill[s]] for s in skill_names if s in pos_to_skill]
            db.add(emp)
            await db.flush()
        await db.commit()
        print('Seed complete!')
        print('Admin: admin@test.com / admin123')
        print('Employees: any email / 123456')

asyncio.run(seed())
