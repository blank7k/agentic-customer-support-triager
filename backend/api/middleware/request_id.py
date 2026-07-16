import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Extract X-Request-ID from request header, or generate a new UUID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        
        # Store in request state for logging context
        request.state.request_id = request_id
        
        # Process request
        response = await call_next(request)
        
        # Append Request ID to response headers
        response.headers["X-Request-ID"] = request_id
        return response
