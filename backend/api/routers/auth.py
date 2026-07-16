from fastapi import APIRouter, Depends
from api.schemas.auth import UserOut
from api.dependencies.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/me", response_model=UserOut)
def get_me(current_user: UserOut = Depends(get_current_user)):
    """
    Returns the details of the currently authenticated user based on JWT decoding.
    """
    return current_user
