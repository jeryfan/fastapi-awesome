from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.schemas.response import ApiResponse


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    处理请求数据验证失败的异常
    """
    # 从异常中提取简化的错误信息
    simplified_errors = [
        {
            "loc": ".".join(map(str, error["loc"])),
            "msg": error["msg"],
            "type": error["type"],
        }
        for error in exc.errors()
    ]

    return JSONResponse(
        status_code=422,
        content=ApiResponse(
            code=422, msg="请求参数验证失败", data={"details": simplified_errors}
        ).model_dump(),
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    """
    处理 HTTP 异常
    """
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse(
            code=exc.status_code, msg=exc.detail, data=None
        ).model_dump(),
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """
    捕获所有未被处理的异常
    """

    return JSONResponse(
        status_code=500,
        content=ApiResponse(
            code=500, message="服务器内部发生错误", data=None
        ).model_dump(),
    )


def set_up(app: FastAPI):

    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
