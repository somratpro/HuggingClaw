from pydantic import BaseModel, Field
from typing import Any, Literal

class AIAction(BaseModel):
    thought: str
    action: str
    args: dict[str, Any] = Field(default_factory=dict)

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    confirm_dangerous: bool = False

class ExecuteRequest(BaseModel):
    action: str
    args: dict[str, Any] = Field(default_factory=dict)
    confirm_dangerous: bool = False

class MemorySearchRequest(BaseModel):
    session_id: str = "default"
    query: str

class ToolResult(BaseModel):
    success: bool
    output: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None

class ActionLog(BaseModel):
    action: str
    permission: Literal["SAFE", "MEDIUM", "DANGEROUS"]
    args: dict[str, Any] = Field(default_factory=dict)
