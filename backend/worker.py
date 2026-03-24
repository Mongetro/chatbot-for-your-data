"""
Worker module for document processing and LLM interaction.
"""

import logging
import os
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
import groq

from backend.config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GroqLLM:
    """Simple wrapper for Groq API."""
    
    def __init__(self, api_key: str, model: str, temperature: float, max_tokens: int):
        self.client = groq.Groq(api_key=api_key)
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        logger.info(f"Groq client initialized with model: {self.model}")
    
    def _call(self, prompt: str) -> str:
        try:
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based on the provided context. Provide concise, accurate answers."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq API error: {str(e)}")
            return f"Error: {str(e)}"


# Global variables
retrieval_chain = None
embeddings = None
llm = None


def init_llm():
    """Initialize the LLM and embeddings."""
    global llm, embeddings
    logger.info("Initializing Groq LLM and embeddings...")
    
    if not Config.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set. Please add it to .env file")
    
    llm = GroqLLM(
        api_key=Config.GROQ_API_KEY,
        model=Config.GROQ_MODEL,
        temperature=Config.TEMPERATURE,
        max_tokens=Config.MAX_NEW_TOKENS
    )
    
    embeddings = HuggingFaceEmbeddings(
        model_name=Config.EMBEDDINGS_MODEL
    )
    logger.info("LLM and embeddings initialized")


def process_document(file_path: str) -> tuple:
    """
    Process a PDF document and create a retrieval chain.
    
    Returns:
        tuple: (success: bool, message: str)
    """
    global retrieval_chain
    logger.info(f"Processing document: {file_path}")
    
    try:
        # Load PDF
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        logger.info(f"Loaded {len(documents)} page(s)")
        
        if len(documents) == 0:
            return False, "The PDF file appears to be empty or unreadable."
        
        # Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=Config.CHUNK_SIZE,
            chunk_overlap=Config.CHUNK_OVERLAP
        )
        texts = text_splitter.split_documents(documents)
        logger.info(f"Split into {len(texts)} chunks")
        
        if len(texts) == 0:
            return False, "Could not extract text from the PDF. Please check if it contains readable text."
        
        # Create vector store
        vectorstore = Chroma.from_documents(texts, embedding=embeddings)
        retriever = vectorstore.as_retriever(search_kwargs={'k': Config.RETRIEVAL_K})
        
        def qa_chain(query: str) -> str:
            docs = retriever.get_relevant_documents(query)
            if not docs:
                return "I couldn't find relevant information in the document."
            
            context = "\n\n".join([doc.page_content for doc in docs[:Config.RETRIEVAL_K]])
            prompt = f"""Based on the following document content, answer the question.

Document content:
{context}

Question: {query}

Answer:"""
            
            return llm._call(prompt)
        
        retrieval_chain = qa_chain
        logger.info("Document processed successfully")
        return True, "Document processed successfully"
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        error_msg = str(e)
        if "np.float_" in error_msg:
            error_msg = "NumPy compatibility issue. Please run: pip install numpy==1.26.4"
        return False, f"Error: {error_msg}"


def process_prompt(prompt: str) -> str:
    """Process a user prompt and return a response."""
    global retrieval_chain
    if retrieval_chain is None:
        return "Please upload a document first."
    return retrieval_chain(prompt)