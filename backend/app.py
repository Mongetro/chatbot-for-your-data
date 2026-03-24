"""
Flask application for the Chatbot for Your Data service.
"""

import logging
import os
from pathlib import Path
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

from backend.worker import init_llm, process_document, process_prompt
from backend.config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(
    __name__,
    template_folder=Path(__file__).parent.parent / 'frontend' / 'templates',
    static_folder=Path(__file__).parent.parent / 'frontend' / 'static'
)
CORS(app)

# Upload folder
UPLOAD_FOLDER = Path(__file__).parent.parent / 'uploads'
UPLOAD_FOLDER.mkdir(exist_ok=True)

# Initialize LLM
try:
    init_llm()
    logger.info("LLM initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize LLM: {e}")


@app.route('/')
def index():
    """Serve the main chat interface."""
    return render_template('index.html')


@app.route('/process-document', methods=['POST'])
def process_document_route():
    """Upload and process a PDF document."""
    try:
        if 'file' not in request.files:
            return jsonify({"botResponse": "Please select a PDF file."}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"botResponse": "No file selected."}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"botResponse": "Please upload a PDF file."}), 400
        
        file_path = UPLOAD_FOLDER / file.filename
        file.save(file_path)
        logger.info(f"File saved: {file_path}")
        
        success, message = process_document(str(file_path))
        
        if success:
            return jsonify({
                "botResponse": "Thank you for providing your PDF document! I have analyzed it, so now you can ask me any questions regarding it!"
            })
        else:
            return jsonify({"botResponse": f"❌ {message}"}), 500
        
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({"botResponse": f"❌ Error processing document: {str(e)}"}), 500


@app.route('/process-message', methods=['POST'])
def process_message_route():
    """Process a user message and return a response."""
    try:
        data = request.get_json()
        user_message = data.get('userMessage', '')
        logger.info(f"Processing message: {user_message[:100]}...")
        
        response = process_prompt(user_message)
        return jsonify({"botResponse": response})
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({"botResponse": f"Error: {str(e)}"}), 500


@app.route('/reset', methods=['POST'])
def reset_route():
    """Reset the chat history."""
    return jsonify({"botResponse": "Chat history has been reset! You can start a new conversation."})