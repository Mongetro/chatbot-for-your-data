/**
 * Chatbot for Your Data - Frontend JavaScript
 * Handles UI interactions, file uploads, API communication, and dark mode toggle
 */

// ============================================
// Global State Variables
// ============================================
let lightMode = true; // Current theme mode
let isFirstMessage = true; // Whether this is the first message (shows upload button)
let isDocumentUploaded = false; // Whether a document has been successfully uploaded
const baseUrl = window.location.origin;

// DOM Element References
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const resetButton = document.getElementById('reset-button');
const modeSwitch = document.getElementById('light-dark-mode-switch');
const messageList = document.getElementById('message-list');
const loadingAnimations = document.querySelectorAll('.loading-animation');

// ============================================
// Utility Functions
// ============================================

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} Escaped HTML string
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

/**
 * Scroll the chat window to the bottom
 */
function scrollToBottom() {
  const chatWindow = document.getElementById('chat-window');
  if (chatWindow) {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

/**
 * Sleep/delay utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the delay
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Clean user input by removing unwanted characters
 * @param {string} value - Raw user input
 * @returns {string} Cleaned input
 */
function cleanTextInput(value) {
  return value
    .trim()
    .replace(/[\n\t]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>&;]/g, '');
}

// ============================================
// Loading Animation Handlers
// ============================================

/**
 * Show the bot loading animation and disable input controls
 */
async function showBotLoadingAnimation() {
  await sleep(200);
  if (loadingAnimations[1]) {
    loadingAnimations[1].style.display = 'inline-block';
  }
  if (sendButton) sendButton.disabled = true;
  if (messageInput) messageInput.disabled = true;
}

/**
 * Hide the bot loading animation and enable input if document is uploaded
 */
function hideBotLoadingAnimation() {
  if (loadingAnimations[1]) {
    loadingAnimations[1].style.display = 'none';
  }
  if (!isFirstMessage && isDocumentUploaded) {
    if (sendButton) sendButton.disabled = false;
    if (messageInput) messageInput.disabled = false;
  }
}

// ============================================
// API Communication Functions
// ============================================

/**
 * Send a user message to the backend
 * @param {string} userMessage - The user's question
 * @returns {Promise<Object>} Response from the backend
 */
async function processUserMessage(userMessage) {
  const response = await fetch(`${baseUrl}/process-message`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage: userMessage }),
  });
  return await response.json();
}

/**
 * Upload a PDF document to the backend
 * @param {File} file - The PDF file to upload
 * @returns {Promise<Object>} Response from the backend
 */
async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${baseUrl}/process-document`, {
    method: 'POST',
    body: formData,
  });
  return await response.json();
}

/**
 * Reset the conversation on the backend
 * @returns {Promise<Object>} Response from the backend
 */
async function resetConversation() {
  const response = await fetch(`${baseUrl}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return await response.json();
}

// ============================================
// UI Rendering Functions
// ============================================

/**
 * Add a user message to the chat window
 * @param {string} message - The user's message
 */
function addUserMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message-line my-text';
  messageDiv.innerHTML = `
        <div class='message-box my-text${!lightMode ? ' dark' : ''}'>
            <div class='me'>${escapeHtml(message)}</div>
        </div>
    `;
  messageList.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * Add a bot message to the chat window
 * @param {string} message - The bot's response
 * @param {string} uploadButtonHtml - Optional HTML for upload button (first message only)
 */
function addBotMessage(message, uploadButtonHtml = '') {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message-line';
  messageDiv.innerHTML = `
        <div class='message-box${!lightMode ? ' dark' : ''}'>
            ${escapeHtml(message)}${uploadButtonHtml ? '<br>' + uploadButtonHtml : ''}
        </div>
    `;
  messageList.appendChild(messageDiv);
  scrollToBottom();
}

// ============================================
// File Upload Setup
// ============================================

/**
 * Set up the file upload button event handlers
 * This is called after the first message is rendered
 */
function setupFileUpload() {
  setTimeout(() => {
    const uploadBtn = document.getElementById('upload-button');
    const fileInput = document.getElementById('file-upload');

    if (uploadBtn && fileInput) {
      // Trigger file selection when button is clicked
      uploadBtn.onclick = () => fileInput.click();

      // Handle file selection
      fileInput.onchange = async function () {
        const file = this.files[0];
        if (!file) return;

        await showBotLoadingAnimation();

        try {
          const result = await uploadDocument(file);

          // Hide loading animation first
          hideBotLoadingAnimation();

          if (result.botResponse) {
            isDocumentUploaded = true;
            if (sendButton) sendButton.disabled = false;
            if (messageInput) {
              messageInput.disabled = false;
              messageInput.placeholder =
                'Ask a question about your document...';
            }
            if (uploadBtn) {
              uploadBtn.disabled = true;
              uploadBtn.textContent = '✓ PDF Uploaded';
              uploadBtn.style.backgroundColor = '#28a745';
            }
            addBotMessage('✅ ' + result.botResponse);
          } else {
            addBotMessage('❌ Failed to upload document. Please try again.');
          }
        } catch (error) {
          console.error('Upload error:', error);
          hideBotLoadingAnimation();
          addBotMessage(
            '❌ Error uploading document. Please check the file and try again.',
          );
        }
      };
    } else {
      // Retry if elements aren't ready yet
      setTimeout(setupFileUpload, 500);
    }
  }, 100);
}

// ============================================
// Bot Response Handler
// ============================================

/**
 * Generate and display bot response
 * @param {string} userMessage - Optional user message (for subsequent messages)
 */
async function populateBotResponse(userMessage) {
  await showBotLoadingAnimation();

  let response;
  let uploadButtonHtml = '';

  if (isFirstMessage) {
    // First message - show welcome and upload button
    response = {
      botResponse:
        "Hello there! I'm your friendly data assistant, ready to answer any questions regarding your data. Could you please upload a PDF file for me to analyze?",
    };
    uploadButtonHtml = `
            <input type="file" id="file-upload" accept=".pdf" style="display: none;">
            <button id="upload-button" class="btn btn-primary btn-sm" style="margin-top: 12px; padding: 5px 10px; font-size: 14px;">📄 Upload PDF</button>
        `;
    addBotMessage(response.botResponse, uploadButtonHtml);
    isFirstMessage = false;
    setupFileUpload();
  } else {
    // Subsequent messages - process with backend
    try {
      response = await processUserMessage(userMessage);
      addBotMessage(response.botResponse);
    } catch (error) {
      console.error('Error processing message:', error);
      hideBotLoadingAnimation();
      addBotMessage('Sorry, I encountered an error. Please try again.');
    }
  }

  hideBotLoadingAnimation();
}

// ============================================
// Event Handlers
// ============================================

/**
 * Handle sending a message (button click or Enter key)
 */
function handleSendMessage() {
  const message = cleanTextInput(messageInput.value);
  if (message && isDocumentUploaded) {
    addUserMessage(message);
    messageInput.value = '';
    populateBotResponse(message);
  }
}

/**
 * Handle Enter key press in input field
 * @param {KeyboardEvent} event - The key press event
 */
function handleKeyPress(event) {
  if (
    event.key === 'Enter' &&
    messageInput.value.trim() &&
    isDocumentUploaded
  ) {
    handleSendMessage();
  }
}

/**
 * Reset the conversation
 */
async function handleReset() {
  // Clear UI
  messageList.innerHTML = '';
  isFirstMessage = true;
  isDocumentUploaded = false;

  // Reset input controls
  if (sendButton) sendButton.disabled = true;
  if (messageInput) {
    messageInput.disabled = true;
    messageInput.placeholder = 'Please upload a document first...';
    messageInput.value = '';
  }

  // Reset backend
  await resetConversation();

  // Start fresh
  await populateBotResponse();
}

/**
 * Toggle between light and dark mode
 */
function handleModeToggle() {
  document.body.classList.toggle('dark-mode');

  const messageBoxes = document.querySelectorAll('.message-box');
  messageBoxes.forEach((box) => box.classList.toggle('dark'));

  const loadingDots = document.querySelectorAll('.loading-dots');
  loadingDots.forEach((dots) => dots.classList.toggle('dark'));

  const dots = document.querySelectorAll('.dot');
  dots.forEach((dot) => dot.classList.toggle('dark-dot'));

  lightMode = !lightMode;
}

// ============================================
// Initialize Application
// ============================================

$(document).ready(function () {
  // Disable input initially
  if (sendButton) sendButton.disabled = true;
  if (messageInput) {
    messageInput.disabled = true;
    messageInput.placeholder = 'Please upload a document first...';
  }

  // Attach event listeners
  if (sendButton) sendButton.addEventListener('click', handleSendMessage);
  if (messageInput) messageInput.addEventListener('keypress', handleKeyPress);
  if (resetButton) resetButton.addEventListener('click', handleReset);
  if (modeSwitch) modeSwitch.addEventListener('change', handleModeToggle);

  // Start the conversation
  populateBotResponse();
});
