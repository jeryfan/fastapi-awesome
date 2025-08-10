from fastapi import Depends, APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.auth import get_current_active_user, get_current_user
from app.models.db import get_db
from app.models.user import User
from app.schemas.chat import (
    ChatCompletionRequest,
    ConversationCreate,
    ConversationList,
    ConversationOut,
    MessageOut,
)
from typing import Annotated, List
from uuid import UUID
import logging
from app.core.router import APIRoute
from app.crud.chat import conversation_crud, message_crud
from app.core.llm.llm import llm_provider

router = APIRouter(route_class=APIRoute)
logger = logging.getLogger(__name__)


@router.post("/v1/conversations", response_model=ConversationOut)
async def api_create_conversation(
    payload: ConversationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    conv = await conversation_crud.create_conversation(
        db, obj_in=payload, created_by=current_user.id
    )
    return conv


@router.get("/v1/conversations", response_model=List[ConversationOut])
async def api_list_conversations(
    list_in: ConversationList,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    convs = await conversation_crud.list_conversations(
        db,
        limit=list_in.limit,
        page=list_in.page,
        created_by=current_user.id,
    )
    return convs


@router.get("/v1/conversations/{conv_id}", response_model=ConversationOut)
async def api_get_conversation(id: UUID, db: AsyncSession = Depends(get_db)):
    conv = await conversation_crud.get_by_id(db, id=id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    return conv


@router.get(
    "/v1/conversations/{conversation_id}/messages", response_model=List[MessageOut]
)
async def api_get_messages(
    conversation_id: UUID,
    limit: int = 200,
    page: int = 1,
    db: AsyncSession = Depends(get_db),
):
    conv = await conversation_crud.get_by_id(db, id=conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    msgs = await message_crud.list_messages(
        db, limit=limit, page=page, conversation_id=conversation_id
    )
    return msgs


@router.post("/v1/chat/completions")
async def api_chat_completions(
    request: ChatCompletionRequest, db: AsyncSession = Depends(get_db)
):

    if request.stream:
        # 返回流式响应
        return StreamingResponse(
            llm_provider.stream_generate(request), media_type="text/event-stream"
        )
    else:
        # 返回非流式响应
        return await llm_provider.generate(request)
