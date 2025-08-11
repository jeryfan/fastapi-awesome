import asyncio
from datetime import datetime
import os
from typing import AsyncGenerator, Optional

from fastapi import HTTPException
import openai
from app.schemas.chat import (
    ChatCompletionChoice,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionStreamChoice,
    ChatCompletionStreamResponse,
    ChatMessage,
    DeltaMessage,
    Usage,
)


class ModelProvider:
    """模型提供者的抽象基类"""

    async def generate(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """为非流式请求生成完整的响应"""
        raise NotImplementedError

    async def stream_generate(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """为流式请求生成SSE事件流"""
        raise NotImplementedError


class LocalEchoProvider(ModelProvider):
    """
    简单回显模型提供者。
    将用户最后一条消息原样返回，主要用于测试和开发。
    """

    async def generate(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        last_user_msg = next(
            (m for m in reversed(request.messages) if m.role == "user"), None
        )
        content = last_user_msg.content if last_user_msg else "(no user message)"

        now_ts = int(datetime.utcnow().timestamp())
        return ChatCompletionResponse(
            id=f"local-{now_ts}",
            created=now_ts,
            model=request.model or "local-echo",
            choices=[
                ChatCompletionChoice(
                    index=0,
                    message=ChatMessage(role="assistant", content=f"Echo: {content}"),
                    finish_reason="stop",
                )
            ],
            usage=Usage(
                prompt_tokens=len(request.messages),
                completion_tokens=1,
                total_tokens=len(request.messages) + 1,
            ),
        )

    async def stream_generate(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """模拟流式回显"""
        last_user_msg = next(
            (m for m in reversed(request.messages) if m.role == "user"), None
        )
        content = last_user_msg.content if last_user_msg else "(no user message)"

        # 模拟SSE事件流
        now_ts = int(datetime.utcnow().timestamp())
        resp_id = f"local-stream-{now_ts}"

        # 1. 发送第一个数据块 (包含角色信息)
        first_chunk = ChatCompletionStreamResponse(
            id=resp_id,
            created=now_ts,
            model=request.model,
            choices=[
                ChatCompletionStreamChoice(
                    index=0, delta=DeltaMessage(role="assistant")
                )
            ],
        )
        yield f"data: {first_chunk.model_dump_json()}\n\n"
        await asyncio.sleep(0.1)

        # 2. 逐字发送内容
        full_content = f"Echo: {content}"
        for char in full_content:
            chunk = ChatCompletionStreamResponse(
                id=resp_id,
                created=now_ts,
                model=request.model,
                choices=[
                    ChatCompletionStreamChoice(
                        index=0, delta=DeltaMessage(content=char)
                    )
                ],
            )
            yield f"data: {chunk.model_dump_json()}\n\n"
            await asyncio.sleep(0.05)

        # 3. 发送结束标志
        end_chunk = ChatCompletionStreamResponse(
            id=resp_id,
            created=now_ts,
            model=request.model,
            choices=[
                ChatCompletionStreamChoice(
                    index=0, delta=DeltaMessage(), finish_reason="stop"
                )
            ],
        )
        yield f"data: {end_chunk.model_dump_json()}\n\n"

        # 4. 发送SSE结束信号
        yield "data: [DONE]\n\n"


class OpenAIProvider(ModelProvider):
    """OpenAI API的模型提供者"""

    def __init__(self, api_key: Optional[str] = None):
        # 使用环境变量或直接传入的api_key
        self.client = openai.AsyncOpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        if not self.client.api_key:
            raise ValueError(
                "OpenAI API key is not provided. Please set the OPENAI_API_KEY environment variable or pass it during initialization."
            )

    def _prepare_payload(self, request: ChatCompletionRequest) -> dict:
        """准备发送给OpenAI API的载荷"""
        return {
            "model": request.model,
            "messages": [
                {"role": m.role, "content": m.content} for m in request.messages
            ],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "n": request.n,
            "top_p": request.top_p,
            "stop": request.stop,
            "stream": request.stream,
        }

    async def generate(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """调用OpenAI API获取完整响应 (非流式)"""
        request.stream = False  # 确保stream为False
        payload = self._prepare_payload(request)

        try:
            res = await self.client.chat.completions.create(**payload)
            # 直接使用Pydantic模型进行转换，更安全、更简洁
            return ChatCompletionResponse.model_validate(res)
        except openai.APIError as e:
            raise HTTPException(status_code=e.status_code, detail=e.message)

    async def stream_generate(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """调用OpenAI API并以SSE格式流式返回响应"""
        request.stream = True
        payload = self._prepare_payload(request)

        try:
            stream = await self.client.chat.completions.create(**payload)
            async for chunk in stream:
                # 将OpenAI的块模型转换为我们的SSE响应模型
                # Pydantic的model_dump_json会自动处理None值
                sse_chunk = ChatCompletionStreamResponse.model_validate(
                    chunk.model_dump()
                )
                yield f"data: {sse_chunk.model_dump_json(exclude_none=True)}\n\n"

            # OpenAI的Python SDK在结束后会自动处理，但为了兼容性，我们手动发送[DONE]
            yield "data: [DONE]\n\n"
        except openai.APIError as e:
            # 在流中处理错误可能比较棘手，这里我们简单地记录并停止
            print(f"An error occurred during streaming: {e}")
            # 可以在这里yield一个错误格式的SSE事件
            error_message = {"error": {"code": e.status_code, "message": e.message}}
            import json

            yield f"data: {json.dumps(error_message)}\n\n"
            yield "data: [DONE]\n\n"


class SiliconflowProvider(OpenAIProvider):

    def __init__(self):
        # 使用环境变量或直接传入的api_key
        self.client = openai.AsyncOpenAI(
            base_url="https://api.siliconflow.cn/v1",
            api_key="sk-ekppvtvqrksaqhkgbeseodmgmcrwtekivxyswmufmbodxfnp",
        )


llm_provider = SiliconflowProvider()
