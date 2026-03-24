#!/usr/bin/env python
"""
Entry point for the Chatbot for Your Data application.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from backend.app import app
from backend.config import Config

if __name__ == "__main__":
    Config.print_config()
    app.run(
        debug=False,  # Disable debug mode in production
        port=8000,
        host='0.0.0.0'  # Important for Docker
    )