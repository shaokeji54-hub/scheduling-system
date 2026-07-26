from pydantic import BaseModel, ConfigDict


class SkillBase(BaseModel):
    name: str
    description: str = ""


class SkillCreate(SkillBase):
    pass


class SkillResponse(SkillBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class PositionSkillsUpdate(BaseModel):
    skill_ids: list[int]


class EmployeeSkillsUpdate(BaseModel):
    skill_ids: list[int]
