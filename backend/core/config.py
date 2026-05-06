from pydantic import BaseModel
import os

class Settings(BaseModel):
    base_url: str = os.getenv('DIVYA_MODEL_BASE_URL', 'http://localhost:11434/v1')
    api_key: str = os.getenv('DIVYA_MODEL_API_KEY', '')
    model_id: str = os.getenv('DIVYA_MODEL_ID', 'llama3')
    require_confirm_dangerous: bool = os.getenv('DIVYA_REQUIRE_CONFIRM_DANGEROUS', 'true').lower() == 'true'
    admin_token: str = os.getenv('DIVYA_ADMIN_TOKEN', 'divya-dev-token')
    allowed_origins: str = os.getenv('DIVYA_ALLOWED_ORIGINS', '*')
    rate_limit_per_minute: int = int(os.getenv('DIVYA_RATE_LIMIT_PER_MINUTE', '120'))

settings = Settings()
