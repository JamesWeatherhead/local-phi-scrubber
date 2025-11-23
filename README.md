# Local PHI Scrubber Chrome Extension

Chrome extension that removes Protected Health Information (PHI) from clinical text using a locally hosted Microsoft Phi-3 Mini 128K large language model served via Ollama. All data stays on your machine.

**IMPORTANT CAVEAT:** Language models are non-deterministic and may miss identifiers or over-redact. Manual review of all output is mandatory before use.

## Demo

https://github.com/user-attachments/assets/41ecc0f7-7d30-4de9-b03e-c77408854340

## How It Works

### User Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User enters clinical text in extension popup             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Extension sends text + prompt to local Ollama server     │
│    (HTTP POST to localhost:11434/api/generate)              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Phi-3 Mini processes text locally on user's machine      │
│    - Identifies PHI using Safe Harbor rules                 │
│    - Replaces with [NAME], [DATE], [MRN], etc.              │
│    - Returns de-identified text                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Extension displays results for human review              │
│    - Shows original and scrubbed text comparison            │
│    - Counts PHI identifiers removed                         │
│    - **Mandatory manual verification step**                 │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────────┐  ┌────────────────────────────────┐
│ Copy to Clipboard│  │ Inject into Any Online LLM     │
│ for manual paste │  │ (ChatGPT, Claude, Gemini, etc) │
└──────────────────┘  └────────────────────────────────┘
```

## Project Structure

```
local-phi-scrubber/
├── manifest.json          # Chrome extension manifest (defines permissions, content scripts, icons)
├── popup.html             # Extension popup UI structure (HTML markup for the interface)
├── popup.js               # Main popup logic (handles user input, Ollama API calls, UI updates)
│                          # CONTAINS SYSTEM PROMPT: PROMPT_TEMPLATE constant (lines 11-82)
├── content.js             # Content script (injects scrubbed text into chat interfaces)
├── styles.css             # Popup UI styling (CSS for extension interface)
├── README.md              # Project documentation (this file)
├── LICENSE                # MIT license text
├── demo.mp4               # Demo video showing extension in action
└── icons/                 # Extension icon assets
    ├── icon16.png         # 16x16 icon (toolbar)
    ├── icon48.png         # 48x48 icon (extension management)
    └── icon128.png        # 128x128 icon (Chrome Web Store)
```

## Installation & Setup

### Prerequisites

Before installing the extension, ensure you have:
- **Chrome or Edge** version 128 or later
- **Ollama** installed on your machine
- **4GB+ system RAM minimum** (8GB+ recommended for comfortable use)
- Optional but beneficial: GPU with VRAM for faster inference

### Step 1: Install Ollama

Ollama is the local inference engine that runs Phi-3 Mini.

1. Visit **https://ollama.ai** and download Ollama for your operating system
   - macOS (Intel & Apple Silicon)
   - Windows
   - Linux
2. Install and launch Ollama
3. Ollama will run as a background service on `http://localhost:11434`

### Step 2: Download Phi-3 Mini Model

Once Ollama is running, open a terminal and pull the Phi-3 Mini model:

```bash
ollama pull phi3:mini
```

This downloads the model (~2.03GB with Q4_0 quantization). First download may take 3-10 minutes depending on internet speed. You can also use `ollama pull phi3:medium` (14B) or `ollama pull phi3` (4K context) variants if you prefer.

Verify installation with:
```bash
ollama list
```

You should see `phi3:mini` in the list of available models.

### Step 3: Load the Extension in Chrome

1. Open Chrome and navigate to **chrome://extensions**
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Navigate to the `local-phi-scrubber` folder and select it
5. The extension should appear in your extensions list and toolbar

### Step 4: Verify Ollama Connection

1. Click the extension icon in your Chrome toolbar
2. You should see a green status indicator: **"AI ready • Ollama + Phi-3"**
3. If you see an error, verify:
   - Ollama is running (`ollama serve` in terminal)
   - Phi-3 Mini is installed (`ollama list`)
   - Port 11434 is accessible

### Step 5: Test De-Identification

1. Paste sample clinical text in the extension textarea:
   ```
   Patient John Smith, DOB 12/15/1985, MRN #123456
   Admitted to Boston General Hospital on 3/10/2024
   Chief complaint: chest pain
   Contact: (617) 555-1234
   ```
2. Click **"Scrub PHI"**
3. Review the output (should show de-identified text with [NAME], [DATE], [MRN], etc.)
4. **IMPORTANT:** Manually verify the results before use in any external system

---

### Technical Flow

1. **User Input** → Textarea in `popup.html`
2. **Scrub Button Click** → `popup.js:scrubPHI()` function
3. **API Call** → HTTP POST to `localhost:11434/api/generate` with:
   - Model: `phi3:mini`
   - Prompt: Complete HIPAA de-identification instructions
   - Query: User's clinical text
   - Temperature: 0 (for consistency)
4. **Local Processing** → Ollama runs Phi-3 Mini on user's hardware
5. **Response** → De-identified text returned
6. **Analysis** → Count and display identified PHI tokens
7. **User Review** → Manual verification required
8. **Output** → Either copy to clipboard or inject into chat interface

---

## Features

### What This Extension Provides

| Feature | Description |
|---------|-------------|
| **AI-Assisted De-Identification** | Uses Phi-3 Mini LLM for intelligent PHI removal |
| **Local Processing** | All computation happens on your machine, zero cloud transmission |
| **HIPAA Safe Harbor Aligned** | Targets all 18 Safe Harbor identifiers |
| **Two Output Methods** | Copy to clipboard OR inject directly into any online LLM platform |
| **Real-Time Status** | Shows Ollama connection status in UI |
| **PHI Analytics** | Displays count of identifiers removed |
| **Minimal Permissions** | Only requests necessary Chrome permissions |
| **Open Source** | MIT licensed, fully auditable code |

### What This Extension DOES NOT Provide

| Limitation | Why It Matters |
|-----------|---------------|
| **Guarantee of de-identification** | LLMs are non-deterministic; manual verification is required |
| **Standalone HIPAA compliance** | Human review is mandatory; this is a tool, not a safeguard |
| **100% PHI detection** | Language models may miss some identifiers |
| **Zero false positives** | May over-identify and remove non-sensitive content |
| **Real-time learning** | Cannot improve from past errors without model retraining |
| **Offline operation** | Requires Ollama to be installed and running locally |

---

## Privacy & Security

### What Data Stays Private

- **All processing is local** - Your text never leaves your machine
- **No cloud API calls** - No data transmission to external servers
- **No telemetry** - Extension doesn't track or report your usage
- **No API keys needed** - Ollama runs entirely on localhost
- **No authentication required** - No login, no accounts, no tracking
- **Open source code** - You can audit every line (1.2KB popup.js, 2.4KB content.js)
- **MIT licensed** - Permissive open source license, commercial use allowed

### Permissions Explanation

The extension requests minimal permissions:

```json
{
  "permissions": ["activeTab", "scripting"],
  "host_permissions": [
    "http://localhost:11434/*",        // Local Ollama inference
    "https://chatgpt.com/*",           // ChatGPT (OpenAI)
    "https://www.perplexity.ai/*",     // Perplexity AI
    "https://claude.ai/*",             // Claude (Anthropic)
    "https://gemini.google.com/*",     // Gemini (Google)
    "https://copilot.microsoft.com/*", // Copilot (Microsoft)
    "https://huggingface.co/*",        // Hugging Face Chat
    "https://github.com/*"             // GitHub Copilot
  ]
}
```

Note: You can add more LLM platforms by updating the host_permissions in manifest.json.

**No tracking, no analytics, no third-party APIs.**

---

## System Requirements

### Minimum Requirements (It's Smaller Than You Think!)

| Component | Requirement |
|-----------|------------|
| **Browser** | Chrome 128+ or Edge 128+ |
| **Operating System** | Windows, macOS, Linux (any recent version) |
| **System RAM** | 4GB minimum (8GB+ recommended) |
| **Disk Space** | 2.5GB for Phi-3 Mini 128K model (Q4 quantized) |
| **Internet** | Only needed to download Ollama and model once |

### What Can Actually Run This

| Hardware | Works? | Performance | Notes |
|----------|--------|-------------|-------|
| **5+ year old laptop (CPU)** | Yes | 5-10 tok/s | Q4 quantization, practical use |
| **Modern laptop (CPU)** | Yes | 10-15 tok/s | No GPU needed |
| **Laptop with GPU** | Yes | 20-40 tok/s | Much faster, optional |
| **Desktop PC** | Yes | Excellent | Best experience |
| **Apple Silicon Mac** | Yes | 107 tok/s | Fastest consumer option |
| **iPhone A16+** | Yes | 12 tok/s | ONNX optimized, practical |
| **Android S21+** | Yes | 8+ tok/s | ONNX optimized, experimental |
| **Raspberry Pi 4** | Maybe | Very slow | Possible with extreme quantization |


## License

MIT License - This software is open source and free for commercial use.

See [LICENSE](./LICENSE) file for complete license text.

---

## Learning Resources

### Understanding PHI & HIPAA Safe Harbor

- [HIPAA De-Identification (Expert Determination & Safe Harbor) – HHS](https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html)
- [18 HIPAA Safe Harbor Identifiers – 45 CFR § 164.514(b)(2)(i) (eCFR)](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.514)

### Understanding Small Language Models

- [Phi-3 Technical Report – arXiv](https://arxiv.org/abs/2404.14219)
- [Phi-3 Mini 128k Instruct – Hugging Face](https://huggingface.co/microsoft/Phi-3-mini-128k-instruct)
- [Ollama Documentation](https://docs.ollama.com)

### LLM Non-Determinism

- [Softmax Function – Wikipedia](https://en.wikipedia.org/wiki/Softmax_function)
- [Temperature and Sampling – OpenAI Docs](https://platform.openai.com/docs/api-reference/responses/create#responses_create-temperature)
