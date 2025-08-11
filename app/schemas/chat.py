from typing import List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="user | assistant | system")
    content: str


class ChatCompletionRequest(BaseModel):
    conversation_id: Optional[str] = None
    model: Optional[str] = "Qwen/Qwen3-8B"
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 1.0
    n: Optional[int] = 1
    stream: Optional[bool] = True
    stop: Optional[List[str]] = None
    max_tokens: Optional[int] = None


class ChatCompletionChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: Optional[str] = None


class Usage(BaseModel):
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatCompletionChoice]
    usage: Optional[Usage] = None


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ConversationList(BaseModel):
    page: int = 1
    limit: int = 20
    title: Optional[str] = None


class ConversationOut(BaseModel):
    id: str
    title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ConversationListOut(BaseModel):
    total: int
    list: List[ConversationOut]


class MessageCreate(BaseModel):
    conversation_id: str
    role: str = Field(..., description="user | assistant | system")
    content: str


class MessageUpdate(BaseModel):
    role: Optional[str] = Field(None, description="user | assistant | system")
    content: Optional[str] = None


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DeltaMessage(BaseModel):
    """流式响应中的消息增量"""

    role: Optional[Literal["system", "user", "assistant"]] = None
    content: Optional[str] = None


class ChatCompletionStreamChoice(BaseModel):
    """流式响应的选择项"""

    index: int
    delta: DeltaMessage
    finish_reason: Optional[str] = None


class ChatCompletionStreamResponse(BaseModel):
    """流式聊天补全响应的数据块模型"""

    id: str
    created: int
    model: str
    choices: List[ChatCompletionStreamChoice]
