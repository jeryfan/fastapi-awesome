import json
from fastapi import Depends, APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.auth import get_current_active_user, get_current_user
from app.models.chat import Conversation, RoleType
from app.models.db import get_db
from app.models.user import User
from app.schemas.chat import (
    ChatCompletionRequest,
    ConversationCreate,
    ConversationHistoryResponse,
    ConversationList,
    ConversationListOut,
    ConversationOut,
    HistoryMessage,
    MessageOut,
)
from typing import Annotated, Any, AsyncGenerator, List
from uuid import UUID
import logging
from app.core.router import APIRoute
from app.crud.chat import conversation_crud, message_crud
from app.core.llm.llm import llm_provider
from app.schemas.response import ApiResponse

router = APIRouter(route_class=APIRoute)
logger = logging.getLogger(__name__)


@router.post("/v1/conversation", response_model=ApiResponse[ConversationOut])
async def api_create_conversation(
    payload: ConversationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    conv = await conversation_crud.create_conversation(
        db, obj_in=payload, created_by=current_user.id
    )
    return ApiResponse(data=conv)


@router.get("/v1/conversation", response_model=ApiResponse[ConversationListOut])
async def api_list_conversations(
    list_in: Annotated[ConversationList, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    convs = await conversation_crud.list_conversations(
        db,
        limit=list_in.limit,
        page=list_in.page,
        created_by=current_user.id,
    )
    print("conversations", convs)
    return ApiResponse(data=ConversationListOut(**convs))


@router.get("/v1/conversation/{id}", response_model=ConversationOut)
async def api_get_conversation(id: UUID, db: AsyncSession = Depends(get_db)):
    conv = await conversation_crud.get_by_id(db, id=id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    return conv


@router.delete("/v1/conversation/{id}", response_model=ApiResponse[bool])
async def api_delete_conversation(id: UUID, db: AsyncSession = Depends(get_db)):
    await conversation_crud.delete(db, primary_key=id)
    return ApiResponse[bool](success=True, data=True)


async def stream_and_save_response(
    request: ChatCompletionRequest,
    db: AsyncSession,
    conversation_id: str,
    created_by: str,
) -> AsyncGenerator[str, None]:

    full_content = ""
    finish_reason = None

    async for chunk_str in llm_provider.stream_generate(request):
        yield chunk_str
        if chunk_str.strip() and chunk_str.startswith("data:"):
            data_part = chunk_str[len("data:") :].strip()
            if data_part != "[DONE]":
                try:
                    chunk_data = json.loads(data_part)
                    choice = chunk_data.get("choices", [{}])[0]
                    delta = choice.get("delta", {})
                    if "content" in delta and delta["content"]:
                        full_content += delta["content"]
                    if "finish_reason" in choice and choice["finish_reason"]:
                        finish_reason = choice["finish_reason"]
                except json.JSONDecodeError:
                    continue

    assistant_message_data = {
        "conversation_id": conversation_id,
        "role": RoleType.ASSISTANT,
        "content": full_content,
        "model": request.model,
        "finish_reason": finish_reason,
        "created_by": created_by,
    }
    await message_crud.insert(db, obj_in=assistant_message_data)


# aip/api/v1/chat.py 或者一个工具文件中

from typing import List, Dict, Any, Union


def _get_title_from_message_content(
    content: Union[str, List[Dict[str, Any]]], length: int = 50
) -> str:
    """从消息的 content 字段智能提取文本作为标题"""
    if isinstance(content, str):
        return content[:length]

    if isinstance(content, list):
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                text = item.get("text", "")
                return text[:length]

    return "新的对话"


@router.post("/v1/chat/completions")
async def api_chat_completions(
    request: ChatCompletionRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    print("api_chat_completions", current_user.id)
    # 1. 查找或创建会话
    conversation_id = request.conversation_id
    if not conversation_id:
        new_conversation = Conversation(
            created_by=current_user.id,
            # current_model=request.model,
            title=_get_title_from_message_content(request.messages),
        )
        db.add(new_conversation)
        await db.commit()
        await db.refresh(new_conversation)
        conversation_id = new_conversation.id

    last_user_message = request.messages[-1]
    user_message_data = {
        "conversation_id": conversation_id,
        "role": RoleType.USER,
        "content": last_user_message.content,
        "created_by": current_user.id,
    }
    await message_crud.insert(db, obj_in=user_message_data)

    if request.stream:
        return StreamingResponse(
            stream_and_save_response(request, db, conversation_id, current_user.id),
            media_type="text/event-stream",
        )
    else:
        response = await llm_provider.generate(request)

        assistant_message = response.choices[0].message
        usage = response.usage
        assistant_message_data = {
            "conversation_id": conversation_id,
            "role": RoleType.ASSISTANT,
            "content": assistant_message.content,
            "model": response.model,
            "prompt_tokens": usage.prompt_tokens if usage else None,
            "completion_tokens": usage.completion_tokens if usage else None,
            "total_tokens": usage.total_tokens if usage else None,
            "finish_reason": response.choices[0].finish_reason,
            "created_by": current_user.id,
        }
        await message_crud.insert(db, obj_in=assistant_message_data)

        return response


@router.get(
    "/v1/conversation/{conversation_id}/messages",
    response_model=ApiResponse[ConversationHistoryResponse],
)
async def get_conversation_history(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):

    conversation = await message_crud.list_messages(
        db, conversation_id, created_by=current_user.id
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.messages.sort(key=lambda m: m.created_at)
    messages = [HistoryMessage.model_validate(msg) for msg in conversation.messages]
    return ApiResponse(
        data=ConversationHistoryResponse(
            id=conversation.id,
            title=conversation.title,
            current_model="",
            messages=messages,
        )
    )
