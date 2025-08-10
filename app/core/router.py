from fastapi import Request, Response
from fastapi.routing import APIRoute as Route

from app.schemas.response import ApiResponse


class APIRoute(Route):
    """API响应处理类"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def get_route_handler(self):

        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request) -> Response:

            response = await original_route_handler(request)

            if isinstance(response, Response):
                return response

            return ApiResponse(data=response)

        return custom_route_handler
