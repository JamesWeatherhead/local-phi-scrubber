/**
 * PHI Scrubber - Content Script
 * Injects scrubbed queries into chat interfaces
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'insertQuery') {
    const success = insertQueryIntoPage(request.query);
    sendResponse({ success });
  }
  return true;
});

function insertQueryIntoPage(query) {
  const selectors = getSelectors();
  const inputField = findInputField(selectors);
  
  if (!inputField) {
    return false;
  }
  
  try {
    insertText(inputField, query);
    return true;
  } catch (error) {
    console.error('Error inserting query:', error);
    return false;
  }
}

function getSelectors() {
  return [
    // ChatGPT
    '#prompt-textarea',
    'textarea[data-id="root"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="Send a message"]',
    
    // Perplexity
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Ask anything"]',
    'textarea.rounded-lg',
    
    // Generic fallbacks
    'textarea[class*="composer"]',
    'textarea[class*="input"]',
    'div[contenteditable="true"]',
    'textarea'
  ];
}

function findInputField(selectors) {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element && isVisible(element)) {
        return element;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

function insertText(inputField, text) {
  if (inputField.isContentEditable || inputField.contentEditable === 'true') {
    inputField.textContent = text;
    dispatchEvents(inputField);
  } else {
    inputField.value = text;
    dispatchEvents(inputField);

    // Trigger React event handlers
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    if (descriptor?.set) {
      descriptor.set.call(inputField, text);
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  inputField.focus();
  if (inputField.setSelectionRange) {
    const length = text.length;
    inputField.setSelectionRange(length, length);
  }
}

function dispatchEvents(element) {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function isVisible(element) {
  return element.offsetWidth > 0 &&
         element.offsetHeight > 0 &&
         window.getComputedStyle(element).visibility !== 'hidden';
}