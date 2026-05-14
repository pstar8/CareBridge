# CareBridge AI 🌉

> A multilingual health communication assistant for immigrant families and anyone who finds medical letters, test results, or medication instructions confusing.

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=flat&logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat&logo=supabase)](https://supabase.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=flat&logo=openai)](https://openai.com)

---

## 🩺 What is CareBridge AI?

Many immigrant families, elderly patients, and people with low health literacy receive medical letters they cannot fully understand. Missed appointments, medication mistakes, and unnecessary anxiety are the result.

**CareBridge AI** takes complex healthcare documents and turns them into simple, translated, spoken, and organised explanations. Users can upload a medical letter, test result, appointment notice, or prescription — and the AI does the rest.

> ⚠️ CareBridge AI is a communication support tool. It does not diagnose, prescribe, or replace medical professionals.

---

## ✨ Key Features

### 📄 Medical Document Explainer

Upload or paste any medical letter, test result, or appointment notice. The AI extracts key information, simplifies the language, highlights what you need to do, and creates a glossary of medical terms.

### 🌍 Multilingual Translation

After simplifying in plain English, the app translates the explanation into the user's preferred language — including Urdu, Hindi, Arabic, French, Spanish, Polish, and more.

### 🔊 Text-to-Speech (Read Aloud)

Every section of the results page has a "read aloud" button using the Web Speech API, so users who struggle with reading can simply listen.

### 📅 Appointment Manager

Appointment letters are parsed by the AI to extract the date, time, hospital, department, doctor, preparation instructions, and contact details. Users can save, filter, take notes, and export appointments to a calendar file.

### 💊 Medication Hub

Track current and past medications with plain-language explanations of what each medicine is for, common side effects, and questions to ask a pharmacist or doctor.

### 🤖 Appointment & Medication Chat

Each saved appointment and medication has its own AI chat window so users can ask specific follow-up questions (e.g. "Do I need to fast before this test?").

### ❓ Question Suggestions

The AI generates suggested questions for every document so users feel prepared before seeing a doctor.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |

|---|---|---|
| Frontend | React 18 + Vite | UI, routing, state management |
| Styling | Tailwind CSS | Responsive, accessible design |
| Backend | Python FastAPI | File handling, AI requests, API |
| AI | OpenAI GPT-4o-mini | Simplification, translation, extraction, chat |
| OCR | PyMuPDF + Tesseract | Extract text from PDFs and images |
| Database | Supabase (PostgreSQL) | Appointments, medications, documents |
| Storage | Supabase Storage | Uploaded files (PDFs, images) |
| Speech | Web Speech API | Text-to-speech read-aloud |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A Supabase project (free tier works)
- An OpenAI API key
- Tesseract OCR installed locally (for image files)

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/carebridge-ai.git
cd carebridge-ai
```

---

### 2. Set up the frontend

```bash
# Install dependencies
npm install

# Create your environment file
cp .env.example .env
```

Add the following to your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8000
```

```bash
# Start the frontend dev server
npm run dev
```

The app will be running at `http://localhost:5173`.

---

### 3. Set up the backend

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate       # Mac/Linux
venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` folder:

```env
OPENAI_API_KEY=your_openai_api_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

```bash
# Start the backend server
uvicorn main:app --reload
```

The API will be running at `http://localhost:8000`.

---

### 4. Set up Supabase

In your Supabase project, create the following:

**Table: `documents`**

| Column | Type |

|---|---|
| id | uuid (primary key) |
| filename | text |
| storage_path | text |
| file_type | text |
| status | text |
| raw_text | text |
| summary | text |
| created_at | timestamp |

**Storage bucket:** Create a public bucket named `uploads`.

---

### 5. Install Tesseract OCR (for image uploads)

- **Windows:** Download the installer from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) and install to `C:\Program Files\Tesseract-OCR\`
- **Mac:** `brew install tesseract`
- **Linux:** `sudo apt install tesseract-ocr`

---

## 🔁 How It Works

```text
User uploads a file or pastes text
        ↓
File is stored in Supabase Storage
        ↓
FastAPI downloads the file and extracts raw text
(PyMuPDF for PDFs, Tesseract for images)
        ↓
GPT-4o-mini classifies the document type
(appointment / test result / medication / discharge)
        ↓
GPT-4o-mini extracts structured data
(dates, times, drug names, test values, etc.)
        ↓
GPT-4o-mini simplifies the text into plain English
        ↓
GPT-4o-mini translates the simplified text (if needed)
        ↓
Results are saved to Supabase and returned to the frontend
        ↓
User sees sections: summary, key actions, glossary,
questions, appointment card, medication card, and translation
```

---

## 📡 API Endpoints

| Method | Route | Description |

|---|---|---|
| `POST` | `/process` | Full pipeline: extract → classify → simplify → translate |
| `POST` | `/classify` | Classify a document by its extracted text |
| `POST` | `/extract` | Extract structured data from text for a given doc type |
| `POST` | `/translate` | Translate already-simplified text into a target language |

---

## 🌐 Supported Languages

| Code | Language |

|---|---|
| `en` | English |
| `ur` | Urdu |
| `ro-ur` | Roman Urdu |
| `hi` | Hindi |
| `ar` | Arabic |
| `fr` | French |
| `es` | Spanish |
| `pl` | Polish |

---

## 📂 Project Structure

```text
carebridge-ai/
│
├── src/
│   ├── pages/
│   │   ├── UploadLetter.jsx       # Document upload page
│   │   ├── Results.jsx            # AI results with translation
│   │   ├── Appointments.jsx       # Appointment list + filters
│   │   ├── AppointmentDetails.jsx # Single appointment + chat
│   │   ├── Medications.jsx        # Medication list + filters
│   │   ├── MedicationDetails.jsx  # Single medication + chat
│   │   ├── AddMedication.jsx      # Add / edit medication
│   │   └── MedicationExport.jsx   # Printable medication summary
│   ├── components/
│   │   ├── ChatBox.jsx            # AI chat per appointment/medication
│   │   ├── ReadAloudButton.jsx    # Text-to-speech button
│   │   ├── SafetyBanner.jsx       # Medical disclaimer banner
│   │   └── UploadBox.jsx          # Drag-and-drop file upload
│   └── App.jsx                    # Routes and layout
│
├── backend/
│   └── main.py                    # FastAPI backend (all endpoints)
│
└── README.md
```

---

## 🛡️ Responsible AI

CareBridge AI was built with patient safety as the top priority:

- The app **never diagnoses** conditions or recommends treatment changes
- Every result page includes a **safety disclaimer** encouraging users to confirm with a doctor
- The AI is instructed to say **"this was not clearly stated"** rather than guess
- Drug names, dosages, dates, and test values are **copied exactly** — never rounded or rephrased
- Users are always directed to a **doctor or pharmacist** before acting on medication information

---

## 🏆 Built For

This project was built as a hackathon submission focused on **social good**, **AI accessibility**, and **healthcare equity** for underserved communities.

---

## 📜 Licence

MIT Licence — free to use, modify, and distribute with attribution.

---

## 🙏 Acknowledgements

- [OpenAI](https://openai.com) — GPT-4o-mini for document AI
- [Supabase](https://supabase.com) — database and file storage
- [NHS](https://www.nhs.uk) — trusted source referenced for medication information
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) — open source OCR engine
