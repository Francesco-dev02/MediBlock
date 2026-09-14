from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    #embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
    words_data_dir: str = "app/data"

    class Config:
        env_file = ".env"


settings = Settings()
