from pydantic import BaseModel
import os

class Settings(BaseModel):
    base_url: str = os.getenv('DIVYA_MODEL_BASE_URL', 'http://localhost:11434/v1')
    api_key: str = os.getenv('DIVYA_MODEL_API_KEY', '')
    model_id: str = os.getenv('DIVYA_MODEL_ID', 'llama3')
    require_confirm_dangerous: bool = os.getenv('DIVYA_REQUIRE_CONFIRM_DANGEROUS', 'true').lower() == 'true'

settings = Settings()
