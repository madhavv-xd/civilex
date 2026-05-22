from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openrouter_api_key: str
    openrouter_model: str = "openai/gpt-oss-120b:free"
    
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "aicivsim"
    frontend_url: str = "http://localhost:3000"
    backend_port: int = 8000

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


settings = Settings()