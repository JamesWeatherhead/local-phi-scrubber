/**
 * PHI Scrubber - Main Popup Logic
 * Uses Ollama Phi-3 to redact Protected Health Information
 */

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_TAGS_URL = 'http://localhost:11434/api/tags';
const MODEL = 'phi3:mini';
const BUTTON_FEEDBACK_TIMEOUT = 2000; // Time to show success feedback

const PROMPT_TEMPLATE = `You are PURELY a text filter, not a writer.

You receive some clinical text as input.
You must output the SAME text, character by character, except for PHI spans that you replace with tags.

CRITICAL RULES (READ CAREFULLY):

1. OUTPUT FORMAT
   - Output ONLY the transformed text.
   - Do NOT add any explanations, comments, labels, or markdown.
   - Do NOT add a prefix like "Redacted:" or "Output:".
   - Do NOT repeat the instructions.
   - The first character you output must be the first character of the transformed text.

2. IDENTITY OF INPUT VS OUTPUT
   - Copy the input text exactly.
   - Only modify spans of PHI by replacing them with tags.
   - Do NOT insert any new words or punctuation.
   - Do NOT delete non-PHI words or punctuation.
   - Do NOT reorder any words or sentences.
   - Preserve all spacing (including multiple spaces), tabs, and line breaks.
   - If the input has N lines, the output must also have N lines.

3. WHAT TO REPLACE (SMALL, SIMPLE TAG SET)
   Replace the following with tags in ALL CAPS and square brackets:

   - Patient, family, staff, or organization names:
     -> [NAME]
   - Hospitals, clinics, institutions, workplaces, street addresses, cities, or regions:
     -> [LOCATION]
   - Any specific dates with day or month (e.g., "May 30, 2022", "05/30/22", "3/10/2024", "on 5/30"):
     -> [DATE]
   - Medical record numbers, chart numbers, account numbers, or similar IDs:
     -> [MRN]
   - Phone numbers or fax numbers:
     -> [PHONE]
   - Email addresses:
     -> [EMAIL]
   - URLs or IP addresses:
     -> [URL]
   - Any other obvious identifier codes or numbers tied to a person:
     -> [ID]

4. DATES AND AGES
   - Replace any date that includes a day or month with [DATE].
   - You may keep years alone (e.g., "in 2022") as-is.
   - Replace ages 90 or older with [AGE].
   - Keep ages under 90 unchanged.

5. PRIORITY
   - If you are unsure whether something is PHI, replace it with the best matching tag.
   - Never invent new medical facts or change clinical content.
   - Your only job is a careful find-and-replace of identifiers with tags.

EXAMPLE (for your understanding only — do NOT include this example in your output):

Input:
Review the postoperative infection rates for Ms. Caroline R., treated at Mercy General Hospital on February 14, 2023, under patient ID 44322199.

Output:
Review the postoperative infection rates for [PATIENT NAME], treated at [HOSPITAL] on [DATE], under patient ID [ID].

Now perform this transformation on the following text.

Remember:
- Copy the input exactly.
- Only replace PHI spans with tags.
- Do NOT add any extra characters.

=== BEGIN TEXT ===
{USER_TEXT}
=== END TEXT ===`;

const elements = {
  statusIndicator: document.getElementById('statusIndicator'),
  statusText: document.getElementById('statusText'),
  queryInput: document.getElementById('queryInput'),
  scrubBtn: document.getElementById('scrubBtn'),
  insertBtn: document.getElementById('insertBtn'),
  copyBtn: document.getElementById('copyBtn'),
  resultSection: document.getElementById('resultSection'),
  resultBox: document.getElementById('resultBox'),
  diffInfo: document.getElementById('diffInfo'),
  errorBox: document.getElementById('errorBox')
};

let scrubbedQuery = '';

async function initializeAI() {
  try {
    const response = await fetch(OLLAMA_TAGS_URL);
    if (!response.ok) throw new Error('Ollama not responding');
    
    const data = await response.json();
    const hasPhi3 = data.models?.some(m => m.name.includes('phi3'));
    
    if (!hasPhi3) {
      throw new Error('Run: ollama pull phi3:mini');
    }
    
    updateStatus('ready', 'AI ready • Ollama + Phi-3');
    elements.scrubBtn.disabled = false;
  } catch (error) {
    updateStatus('error', 'Ollama unavailable');
    showError(`Cannot connect: ${error.message}`);
  }
}

function updateStatus(state, message) {
  elements.statusIndicator.className = `status-indicator ${state}`;
  elements.statusText.textContent = message;
}

function showError(message) {
  elements.errorBox.textContent = message;
  elements.errorBox.style.display = 'block';
}

function updateButton(button, text, color) {
  button.textContent = text;
  button.style.background = color;
  
  setTimeout(() => {
    button.textContent = button.dataset.originalText || text;
    button.style.background = '';
  }, BUTTON_FEEDBACK_TIMEOUT);
}

function analyzePHI(scrubbed) {
  const placeholders = scrubbed.match(/\[([A-Z_]+)\]/g) || [];
  
  return {
    count: placeholders.length,
    types: new Set(placeholders).size,
    placeholders: Array.from(new Set(placeholders))
  };
}

async function scrubPHI() {
  const query = elements.queryInput.value.trim();
  
  if (!query) {
    showError('Enter a query');
    return;
  }

  // Show loading state
  elements.scrubBtn.disabled = true;
  document.querySelector('.btn-text').style.display = 'none';
  document.querySelector('.loader').style.display = 'inline-block';

  try {
    const prompt = PROMPT_TEMPLATE.replace('{USER_TEXT}', query);
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0, // Low temperature reduces variability but LLMs are inherently non-deterministic
          top_k: 1,       // Focus on most likely token
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const text = await response.text();
    const data = JSON.parse(text);
    
    if (!data.response) {
      throw new Error('No response field in Ollama output');
    }

    scrubbedQuery = data.response.trim();
    const analysis = analyzePHI(scrubbedQuery);

    elements.resultBox.textContent = scrubbedQuery;
    elements.diffInfo.innerHTML = `<strong>PHI Removed:</strong> ${analysis.count} (${analysis.types} types)`;
    elements.resultSection.style.display = 'block';
    elements.insertBtn.style.display = 'inline-block';
    elements.copyBtn.style.display = 'inline-block';
    
  } catch (error) {
    showError(`Error: ${error.message}`);
  } finally {
    elements.scrubBtn.disabled = false;
    document.querySelector('.btn-text').style.display = 'inline';
    document.querySelector('.loader').style.display = 'none';
  }
}

async function copyToClipboard() {
  await navigator.clipboard.writeText(scrubbedQuery);
  updateButton(elements.copyBtn, 'Copied', '#34a853');
}

async function insertIntoChat() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url || '';

    if (!url.includes('chat.openai.com') && !url.includes('chatgpt.com') && !url.includes('perplexity.ai')) {
      showError('Please navigate to ChatGPT or Perplexity first');
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      action: 'insertQuery',
      query: scrubbedQuery
    }, (response) => {
      if (chrome.runtime.lastError) {
        showError('Failed to insert. Reload the page and try again.');
      } else if (response?.success) {
        updateButton(elements.insertBtn, 'Inserted', '#34a853');
      }
    });
  } catch (error) {
    showError(`Insert failed: ${error.message}`);
  }
}

elements.scrubBtn.addEventListener('click', scrubPHI);
elements.copyBtn.addEventListener('click', copyToClipboard);
elements.insertBtn.addEventListener('click', insertIntoChat);

initializeAI();
