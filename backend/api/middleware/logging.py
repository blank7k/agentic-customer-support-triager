import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("api_request_logs")
logging.basicConfig(level=logging.INFO)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        request_id = getattr(request.state, "request_id", "N/A")
        path = request.url.path
        method = request.method
        
        # Log request entry
        logger.info(f"[Request Start] ID: {request_id} | {method} {path} from {request.client.host if request.client else 'unknown'}")
        
        try:
            response = await call_next(request)
            duration = time.perf_counter() - start_time
            # Log successful requests
            logger.info(f"[Request Complete] ID: {request_id} | {method} {path} -> Status: {response.status_code} | Duration: {duration:.4f}s")
            return response
        except Exception as e:
            duration = time.perf_counter() - start_time
            # Log failed requests
            logger.error(f"[Request Failed] ID: {request_id} | {method} {path} -> Error: {str(e)} | Duration: {duration:.4f}s")
            raise e
