"""
Configuration management for the chatbot application.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)


class Config:
    """Configuration class for the application."""
    
    # Groq API
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    # Model parameters
    MAX_NEW_TOKENS = int(os.getenv("MAX_NEW_TOKENS", 256))
    TEMPERATURE = float(os.getenv("TEMPERATURE", 0.1))
    
    # Document processing
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1024))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 64))
    RETRIEVAL_K = int(os.getenv("RETRIEVAL_K", 3))
    
    # Embeddings
    EMBEDDINGS_MODEL = os.getenv("EMBEDDINGS_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    
    @classmethod
    def print_config(cls):
        """Display current configuration."""
        print("\n" + "=" * 60)
        print("🤖 Chatbot for Your Data - Configuration")
        print("=" * 60)
        print(f"  Groq Model:       {cls.GROQ_MODEL}")
        print(f"  Max tokens:       {cls.MAX_NEW_TOKENS}")
        print(f"  Temperature:      {cls.TEMPERATURE}")
        print(f"  Chunk size:       {cls.CHUNK_SIZE}")
        print(f"  Retrieval K:      {cls.RETRIEVAL_K}")
        print(f"  Groq API Key:     {'✓ Configured' if cls.GROQ_API_KEY else '✗ Missing'}")
        print("=" * 60 + "\n")