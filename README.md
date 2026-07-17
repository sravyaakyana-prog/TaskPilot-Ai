# TaskPilot AI — Multi-Tool AI Productivity Agent

TaskPilot AI is a full-stack AI productivity assistant that connects **Gmail**, **Google Calendar**, **document intelligence**, **chat history**, and **AI agent workflows** into one modern SaaS-style workspace.

It uses an agent pipeline with **intent classification**, **tool routing**, **Gemini-powered responses**, **document RAG**, **MongoDB persistence**, **Google OAuth**, and **demo mode** to help users summarize emails, search Gmail, draft emails, check calendar events, create meetings, upload documents, and ask questions from files.

---

## 🌐 Live Demo

### Frontend

```txt
https://task-pilot-ai-tau.vercel.app
```

### Backend API

```txt
https://taskpilot-ai-backend-tfa5.onrender.com
```

### Backend Health Check

```txt
https://taskpilot-ai-backend-tfa5.onrender.com/api/health
```

### GitHub Repository

```txt
https://github.com/sravyaakyana-prog/TaskPilot-Ai
```

> Note: Gmail and Calendar features require Google OAuth connection. Demo mode is available for reviewers who do not want to connect a Google account.

---

## 🚀 Features

### AI Agent Workflow

- Intent classification for user queries
- Tool routing based on detected intent
- Agent trace showing selected tool, confidence, and execution steps
- Gemini-powered responses with fallback support
- Demo mode for recruiter/reviewer testing without Google login

### Gmail Assistant

- Google OAuth login
- Gmail connection status
- Summarize unread Gmail messages
- Search emails by topic or sender
- Create Gmail draft responses
- Demo Gmail mode when Google is not connected

### Calendar Assistant

- Query Google Calendar events
- Check today’s meetings
- Create calendar events
- Demo calendar mode when Google is not connected

### Document Intelligence / RAG

- Upload PDF and TXT files
- Extract readable text from text-based PDFs and TXT files
- Smart document chunking
- MongoDB-backed document storage
- Hybrid chunk retrieval
- Gemini-grounded document answers
- Document summarization
- Source and chunk references in answers
- Clean PDF upload validation and error handling

### Chat History and Memory

- Persistent chat history
- Recent chats sidebar
- Load previous conversations
- Clear history
- MongoDB conversation storage

### Production-Oriented Features

- MongoDB Atlas integration
- User-specific chats and documents
- Google token storage in MongoDB
- Health check endpoint
- Production CORS setup
- Environment variable configuration
- Frontend file validation
- SaaS-style deployed dashboard UI

---

## 🖼️ Screenshots

### Dashboard and Quick Actions

Main TaskPilot AI workspace showing quick actions such as Summarize Inbox, Find Internships, Today Calendar, Summarize Doc, and Try Demo.

![Dashboard](assets/screenshots/dashboard.png)

### Document Upload

PDF/TXT upload flow showing successful document processing and chunk creation.

![Document Upload](assets/screenshots/document-upload.png)

### Document RAG Answer

Document question-answering flow where TaskPilot summarizes uploaded files using Gemini-powered RAG.

![Document RAG](assets/screenshots/document-rag-answer.png)

### Demo Mode

Demo mode for testing Gmail and Calendar workflows without connecting a real Google account.

![Demo Mode](assets/screenshots/demo-mode.png)

### Connected Tools

Connected tools panel showing Gmail, Calendar, Documents, and Automation status.

![Connected Tools](assets/screenshots/connected-tools.png)

---

## 🛠️ Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Vercel deployment

### Backend

- Node.js
- Express.js
- TypeScript
- Multer
- Google APIs
- Gemini API
- Render deployment

### Database

- MongoDB Atlas
- Mongoose

### AI / RAG

- Gemini API
- Intent classification
- Tool routing
- Document chunk retrieval
- Grounded document answering

### Integrations

- Google OAuth 2.0
- Gmail API
- Google Calendar API

---

## 🧠 Agent Architecture

```txt
User Message
     ↓
Intent Classifier
     ↓
Tool Selector
     ↓
Tool Router
     ↓
Gmail / Calendar / Document / Demo / Gemini
     ↓
Final Response
     ↓
Agent Trace + Chat History
```

Supported intents:

```txt
GENERAL_CHAT
EMAIL_SUMMARY
EMAIL_SEARCH
EMAIL_DRAFT
CALENDAR_QUERY
CALENDAR_CREATE
DOCUMENT_QA
TASK_PLANNING
DEMO_MODE
```

---

## 📁 Project Structure

```txt
TaskPilot-AI
├── backend
│   ├── src
│   │   ├── config
│   │   ├── controllers
│   │   ├── database
│   │   ├── intents
│   │   ├── models
│   │   ├── routes
│   │   ├── services
│   │   ├── tools
│   │   │   ├── calendar
│   │   │   ├── document
│   │   │   └── gmail
│   │   ├── utils
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
│
├── frontend
│   ├── src
│   │   └── app
│   │       └── page.tsx
│   ├── .env.example
│   └── package.json
│
├── assets
│   └── screenshots
│
└── README.md
```

---

## ⚙️ Environment Variables

### Backend `.env`

Create:

```txt
backend/.env
```

Add:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=your_mongodb_atlas_connection_string_here

LLM_PROVIDER=gemini
LLM_FALLBACK_PROVIDER=mock

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_MAX_OUTPUT_TOKENS=350

GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

FRONTEND_URL=http://localhost:3000

DEMO_MODE_ENABLED=true
```

### Frontend `.env.local`

Create:

```txt
frontend/.env.local
```

Add:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## ▶️ Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/sravyaakyana-prog/TaskPilot-Ai.git
cd TaskPilot-AI
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Start backend

```bash
cd ../backend
npm run dev
```

Backend runs on:

```txt
http://localhost:5000
```

Health check:

```txt
http://localhost:5000/api/health
```

### 5. Start frontend

```bash
cd ../frontend
npm run dev
```

Frontend runs on:

```txt
http://localhost:3000
```

---

## 🔗 API Endpoints

### Health

```txt
GET /api/health
```

### Chat

```txt
POST /api/chat
```

Example request:

```json
{
  "message": "Summarize my unread emails today",
  "conversationId": null
}
```

### Google Auth

```txt
GET    /api/auth/google
GET    /api/auth/google/callback
GET    /api/auth/google/status
POST   /api/auth/google/disconnect
DELETE /api/auth/google/disconnect
```

### Documents

```txt
GET  /api/documents
POST /api/documents/upload
```

### Chat History

```txt
GET    /api/history
GET    /api/history/:id
DELETE /api/history
```

---

## 🧪 Demo Mode

TaskPilot AI includes demo mode so recruiters or reviewers can test the product without connecting their personal Gmail or Calendar.

Demo mode supports:

```txt
Run demo mode
Summarize my emails
Find emails about internships
Draft an email for AI/ML internship
What meetings do I have today?
Create a meeting tomorrow at 6 PM
```

Without Google connection:

- Gmail uses sample demo data
- Calendar uses sample demo data
- Document upload still works with real PDF/TXT files
- Gemini chat still works

With Google connection:

- Gmail uses real Gmail API
- Calendar uses real Google Calendar API

---

## 📄 Document RAG Flow

```txt
Upload PDF/TXT
     ↓
Extract readable text
     ↓
Clean text
     ↓
Create smart chunks
     ↓
Store chunks in MongoDB
     ↓
Retrieve relevant chunks
     ↓
Generate grounded answer using Gemini
     ↓
Show answer with source context
```

Example questions:

```txt
summarize it
what are the key points?
explain process scheduling from this document
what does this document say about threads?
```

> Document upload supports TXT files and text-based PDFs. Scanned/image-based PDFs may not be readable without OCR.

---

## 🔐 Google OAuth Flow

```txt
Connect Google
     ↓
Google OAuth Consent
     ↓
Save user profile in MongoDB
     ↓
Store Google tokens in MongoDB
     ↓
Enable Gmail and Calendar tools
```

The app also supports disconnecting Google from the UI.

---

## 🧾 MongoDB Collections

```txt
users
google_token_sessions
chat_conversations
uploaded_documents
```

---

## 🚀 Deployment

### Backend Deployment

Backend is deployed on Render:

```txt
https://taskpilot-ai-backend-tfa5.onrender.com
```

Backend production environment variables:

```txt
PORT
NODE_ENV
MONGODB_URI
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_MAX_OUTPUT_TOKENS
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
FRONTEND_URL
DEMO_MODE_ENABLED
```

### Frontend Deployment

Frontend is deployed on Vercel:

```txt
https://task-pilot-ai-tau.vercel.app
```

Frontend environment variable:

```txt
NEXT_PUBLIC_API_URL=https://taskpilot-ai-backend-tfa5.onrender.com
```

### Production OAuth URLs

Google OAuth redirect URI:

```txt
https://taskpilot-ai-backend-tfa5.onrender.com/api/auth/google/callback
```

Frontend origin:

```txt
https://task-pilot-ai-tau.vercel.app
```

---

## ✅ Current Status

Completed:

- Full-stack app setup
- Google OAuth
- Gmail tools
- Calendar tools
- MongoDB persistence
- User-specific chats and documents
- Google token storage in MongoDB
- Real Gemini provider
- Gemini fallback safety
- Document upload and RAG
- Demo mode
- Agent trace UI
- Production CORS
- Health check endpoint
- Clean SaaS dashboard UI
- Backend deployed on Render
- Frontend deployed on Vercel

---

---


## 📌 Future Improvements

- JWT-based multi-user authentication
- Encrypted Google token storage
- Role-based user sessions
- Vector embeddings for document retrieval
- MongoDB Atlas Vector Search
- Rate limiting and request protection
- Test coverage
- Logging and monitoring
- Mobile-responsive improvements
- OCR support for scanned/image-based PDFs

---

## 👩‍💻 Author

**Sravya Akyana**

GitHub: `sravyaakyana-prog`