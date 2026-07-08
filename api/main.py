from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from api.core.config import settings
from api.middleware.request_id import RequestIDMiddleware
from api.middleware.logging import LoggingMiddleware

# Import modular routers
from api.routers.health import router as health_router
from api.routers.auth import router as auth_router
from api.routers.chat import router as chat_router
from api.routers.tickets import router as tickets_router
from api.routers.approvals import router as approvals_router
from api.routers.telemetry import router as telemetry_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles initialization and shutdown events for external connections."""
    print(f"Starting {settings.PROJECT_NAME}...")
    yield
    print(f"Shutting down {settings.PROJECT_NAME}...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# 1. Global CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to client domain origin patterns in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Custom Middlewares
app.add_middleware(LoggingMiddleware)
app.add_middleware(RequestIDMiddleware)

# 3. Global Exception Handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    print(f"Unhandled exception occurred. ID: {request_id} | Error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred.",
            "request_id": request_id
        }
    )

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    request_id = getattr(request.state, "request_id", "unknown")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": str(exc),
            "request_id": request_id
        }
    )

# 4. Router Integrations
app.include_router(health_router)

# Versioned API Router Prefix
api_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_prefix)
app.include_router(chat_router, prefix=api_prefix)
app.include_router(tickets_router, prefix=api_prefix)
app.include_router(approvals_router, prefix=api_prefix)
app.include_router(telemetry_router, prefix=api_prefix)
