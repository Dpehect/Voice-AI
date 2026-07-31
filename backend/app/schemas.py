from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str


class LanguageResponse(BaseModel):
    code: str
    name: str
    native_name: str

