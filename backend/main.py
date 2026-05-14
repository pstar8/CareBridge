import io
import os
import json
import requests
import fitz                          # PyMuPDF — PDF text extraction
from PIL import Image                # Pillow  — image handling for OCR
import pytesseract                   # Tesseract OCR — for image files
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from supabase import create_client, Client 
from dotenv import load_dotenv

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

load_dotenv()

app = FastAPI()

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://care-bridge-beta-sage.vercel.app",  # add this
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── OpenAI client ─────────────────────────────────────────────────────────────
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── Supabase client ───────────────────────────────────────────────────────────  ← ADDED
supabase: Client = create_client(
    os.getenv("VITE_SUPABASE_URL"),
    os.getenv("VITE_SUPABASE_SERVICE_KEY"),  # service role so backend can write freely
)

# ── Language labels ───────────────────────────────────────────────────────────
LANGUAGE_LABELS = {
    "en":    "English",
    "ur":    "Urdu",
    "ro-ur": "Roman Urdu (Urdu written in Latin script)",
    "hi":    "Hindi",
    "ar":    "Arabic",
    "fr":    "French",
    "es":    "Spanish",
    "pl":    "Polish",
}

# ── Pydantic models ───────────────────────────────────────────────────────────
class ProcessRequest(BaseModel):
    document_id:  str
    storage_path: str
    file_url:     str   # signed Supabase URL
    file_type:    str   # appointment | test_result | medication | other
    language:     str   # en | ur | ro-ur | hi | ar | fr | es | pl

class ClassifyRequest(BaseModel):
    raw_text: str       # extracted text from the document

class ExtractRequest(BaseModel):
    raw_text: str       # extracted text from the document
    doc_type: str       # appointment | test_result | medication | discharge | other

class ChatMessage(BaseModel):
    role:    str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    document_id: str | None = None   # optional — None means cross-document chat
    user_id:     str                 # required for RAG retrieval + history
    message:     str
    history:     list[ChatMessage] = []  # recent conversation turns


# ── File helpers ──────────────────────────────────────────────────────────────
def download_file(signed_url: str) -> bytes:
    """Downloads the file from a Supabase signed URL. Returns raw bytes."""
    response = requests.get(signed_url, timeout=30)
    if response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to download file from Supabase: {response.status_code} {response.text}",
        )
    return response.content


def extract_text(file_bytes: bytes, storage_path: str) -> str:
    """
    Picks extraction method from file extension:
      .pdf              → PyMuPDF
      .png/.jpg/.jpeg   → Tesseract OCR
      other             → UTF-8 decode fallback
    """
    lower_path = storage_path.lower()

    if lower_path.endswith(".pdf"):
        pdf = fitz.open(stream=file_bytes, filetype="pdf")
        text = "".join(page.get_text() for page in pdf)
        pdf.close()
        return text.strip()

    elif lower_path.endswith((".png", ".jpg", ".jpeg", ".webp")):
        image = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(image).strip()

    else:
        try:
            return file_bytes.decode("utf-8").strip()
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload a PDF, PNG, or JPG.",
            )


# ── Step A: Classify ──────────────────────────────────────────────────────────
def classify_document(raw_text: str) -> dict:
    """
    Asks GPT to read the raw extracted text and classify the document type.
    Returns: { doc_type, confidence, reason }
    
    Isolated from simplification/translation so classification is always done
    in English regardless of the user's selected language — more reliable.
    """
    system_prompt = """You are a medical document classifier for CareBridge AI.

Read the document text provided and classify it into exactly ONE of these types:
- appointment   : appointment letters, referral letters, clinic/hospital visit notices
- test_result   : blood tests, scan results, pathology reports, X-ray reports
- medication    : prescriptions, medication lists, pharmacy notes, drug instructions
- discharge     : discharge summaries, hospital discharge letters
- other         : anything that does not clearly fit the above

Respond ONLY with a JSON object — no markdown, no explanation, no code fences.
Format:
{
  "doc_type": "<one of the five types above>",
  "confidence": "<high | medium | low>",
  "reason": "<one sentence explaining the key clues that led to this classification>"
}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=150,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": f"Classify this document:\n\n{raw_text[:3000]}"},
        ],
        temperature=0,   # deterministic — classification should not be creative
    )

    content = response.choices[0].message.content.strip()

    # Strip accidental markdown fences if the model adds them despite instructions
    content = content.replace("```json", "").replace("```", "").strip()

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        # Fallback if model doesn't comply — return safe defaults
        result = {"doc_type": "other", "confidence": "low", "reason": "Could not parse classification response."}

    return result


# ── Step B: Structured extraction ─────────────────────────────────────────────
# Each doc type has its own schema and prompt so the model knows exactly what
# fields to populate. This drives the Appointment Manager and Medication Hub UI.

EXTRACTION_SCHEMAS = {
    "appointment": {
        "description": "Extract appointment details",
        "fields": {
            "date": "Appointment date (e.g. 12 June 2025) or null",
            "time": "Appointment time (e.g. 10:30 AM) or null",
            "hospital_or_clinic": "Name of the hospital or clinic or null",
            "department": "Department or specialty (e.g. Cardiology) or null",
            "doctor_name": "Doctor or consultant name or null",
            "location_address": "Full address or ward/room details or null",
            "preparation_instructions": "List of things to do before the appointment (e.g. fast, bring medications) or empty list []",
            "contact_number": "Phone number to call with queries or null",
            "reference_number": "Appointment or booking reference or null",
            "duration_minutes": "Expected duration in minutes as integer or null",
        },
    },
    "test_result": {
        "description": "Extract test result details",
        "fields": {
            "test_type": "Name of the test or scan (e.g. Full Blood Count, MRI Brain) or null",
            "test_date": "Date the test was taken or null",
            "result_date": "Date the result was issued or null",
            "ordering_doctor": "Doctor who ordered the test or null",
            "lab_or_facility": "Lab or imaging centre name or null",
            "results": "List of individual results as objects: [{name, value, unit, reference_range, flag}] where flag is 'normal'|'high'|'low'|'abnormal'|null",
            "overall_status": "'normal' | 'abnormal' | 'borderline' | 'unknown'",
            "follow_up_required": "true | false | null",
            "follow_up_details": "What follow-up is recommended or null",
        },
    },
    "medication": {
        "description": "Extract medication details",
        "fields": {
            "medications": "List of medications: [{name, generic_name, dosage, unit, frequency, route, duration, start_date, end_date, instructions, warnings}]",
            "prescriber": "Doctor or prescriber name or null",
            "pharmacy": "Pharmacy name or null",
            "prescription_date": "Date of prescription or null",
            "review_date": "Next medication review date or null",
            "special_instructions": "Any important overall instructions (e.g. avoid alcohol, take with food) or empty list []",
        },
    },
    "discharge": {
        "description": "Extract discharge summary details",
        "fields": {
            "patient_name": "Patient name or null",
            "admission_date": "Date admitted or null",
            "discharge_date": "Date discharged or null",
            "hospital": "Hospital name or null",
            "ward": "Ward or unit or null",
            "admitting_doctor": "Admitting consultant or null",
            "discharge_doctor": "Discharging doctor or null",
            "primary_diagnosis": "Main diagnosis or null",
            "secondary_diagnoses": "List of other diagnoses or empty list []",
            "procedures_performed": "List of procedures or operations done or empty list []",
            "medications_on_discharge": "List of medications prescribed on discharge: [{name, dosage, frequency, duration}]",
            "follow_up_appointments": "List of follow-up appointments: [{specialty, date, location}]",
            "gp_instructions": "Instructions for the patient's GP or null",
            "patient_instructions": "What the patient should do at home or empty list []",
        },
    },
    "other": {
        "description": "Extract any available key details",
        "fields": {
            "document_title": "Title or heading of the document or null",
            "issuing_organisation": "Organisation or hospital that sent this or null",
            "issue_date": "Date on the document or null",
            "patient_name": "Patient name if mentioned or null",
            "key_details": "List of the most important facts, instructions, or values found in the document",
            "action_required": "Any action the patient needs to take or null",
        },
    },
}


def extract_structured_data(raw_text: str, doc_type: str) -> dict:
    """
    Runs a focused structured extraction prompt for the given doc_type.
    Returns a dictionary matching that type's schema.
    Always in English — translation happens separately in simplify_and_translate().
    """
    schema = EXTRACTION_SCHEMAS.get(doc_type, EXTRACTION_SCHEMAS["other"])
    fields_description = "\n".join(
        f'  "{field}": {description}' for field, description in schema["fields"].items()
    )

    system_prompt = f"""You are a medical data extraction assistant for CareBridge AI.

{schema["description"]} from the document text provided.

Return ONLY a JSON object with these exact fields:
{{
{fields_description}
}}

Rules:
- Never invent or guess values. If a field is not clearly stated in the document, use null or an empty list.
- Copy dates, times, drug names, and dosages EXACTLY as written in the document — do not reformat or interpret them.
- For medications, preserve the exact drug name and dosage as written. Never adjust dosage values.
- If a value is ambiguous or unclear, use null and do not guess.
- Respond with ONLY the JSON object. No markdown, no explanation, no code fences."""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=1000,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": f"Extract structured data from this {doc_type.replace('_', ' ')}:\n\n{raw_text[:4000]}"},
        ],
        temperature=0,  # no creativity in extraction — accuracy only
    )

    content = response.choices[0].message.content.strip()
    content = content.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Return an empty shell matching the schema so the frontend doesn't break
        return {field: None for field in schema["fields"]}


# ── Step C: Simplify (plain English, isolated) ────────────────────────────────
def simplify(raw_text: str, doc_type: str) -> str:
    """
    Produces a plain-English simplification ONLY — no translation here.
    Separated from translation so each step has one clear job.
    """
    system_prompt = f"""You are CareBridge AI, a health communication assistant for 
immigrant families and people with low health literacy. Your job is to make 
medical documents easy to understand.

You will receive text from a {doc_type.replace("_", " ")} document.

Write your response in plain, simple English that a 14-year-old could understand.
Your response must include exactly these five sections, in this order:

1. **Simple Summary** — 2–3 sentences: what this document is about and why it matters.
2. **Key Actions** — Bullet list of things the patient must do (attend appointment, take medication, etc.).
3. **Important Dates or Details** — Any dates, times, locations, medication names, or dosages. Copy these exactly from the original — do not rephrase numbers or dates.
4. **Questions to Ask Your Doctor** — 3 questions a patient might want to ask based on this document.
5. **Medical Words Explained** — A short glossary of any medical jargon found in the document.

Critical rules:
- Never diagnose, never recommend starting or stopping a treatment.
- Never rephrase or round dosages, dates, or test values — copy them exactly.
- If something is unclear or missing in the document, say "This was not clearly stated in the letter" rather than guessing.
- End with: "Always confirm these details with your doctor or pharmacist before taking any action." """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=1200,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": f"Here is the document text:\n\n{raw_text[:4000]}"},
        ],
        temperature=0.3,  # slight warmth for readable prose, but not creative
    )

    return response.choices[0].message.content


# ── Step D: Translate (isolated, medically guarded) ───────────────────────────
def translate(simplified_text: str, language: str) -> str:
    """
    Translates the already-simplified English text into the target language.
    Separated from simplification — translation has its own focused prompt
    with medical guardrails.
    
    If language is 'en', this step is skipped entirely (returns unchanged text).
    """
    if language == "en":
        return simplified_text

    lang_label = LANGUAGE_LABELS.get(language, language)

    system_prompt = f"""You are a medical translation assistant for CareBridge AI.

Translate the following simplified health information into {lang_label}.

Medical translation rules — follow these exactly:
1. Preserve all medical terms in their standard {lang_label} equivalent used by healthcare professionals in that language. Do not invent translations for drug names — keep the drug name in its original form.
2. Preserve all numbers, dates, times, dosages, and test values EXACTLY as they appear — never round or reformat them.
3. Preserve the section headings and structure (Simple Summary, Key Actions, etc.).
4. If you are uncertain how to translate a medical term accurately, keep the English term and add the {lang_label} explanation in parentheses.
5. Never add, remove, or change any medical information during translation — only translate meaning, do not interpret.
6. If a phrase has no natural equivalent in {lang_label}, translate the meaning clearly rather than translating word-for-word.

Return only the translated text. No explanation, no preamble."""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=1500,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": simplified_text},
        ],
        temperature=0.1,  # translation must be accurate, not creative
    )

    return response.choices[0].message.content

# ── RAG: Chunk + Embed ────────────────────────────────────────────────────────
def chunk_and_embed(document_id: str, user_id: str, raw_text: str, doc_type: str):
    """
    Splits raw_text into overlapping chunks, embeds each one with OpenAI,
    and stores them in Supabase document_chunks.
    Called once per document inside /process.
    """
    # Simple chunking: 400-word windows with 80-word overlap
    words  = raw_text.split()
    size, overlap = 400, 80
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + size])
        chunks.append(chunk)
        i += size - overlap

    if not chunks:
        return

    # Embed all chunks in one API call (cheaper + faster)
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=chunks,
    )

    rows = [
        {
            "document_id": document_id,
            "user_id":     user_id,
            "chunk_index": idx,
            "chunk_text":  chunk,
            "embedding":   response.data[idx].embedding,
            "doc_type":    doc_type,
        }
        for idx, chunk in enumerate(chunks)
    ]

    supabase.table("document_chunks").insert(rows).execute()


# ── RAG: Retrieve relevant chunks ────────────────────────────────────────────
def retrieve_relevant_chunks(user_id: str, query: str, top_k: int = 5) -> list[str]:
    """
    Embeds the user's query and retrieves the top_k most semantically
    similar chunks across ALL of that user's documents.
    This is what connects 'heartburn last week' to 'chest pain today'.
    """
    query_embedding = client.embeddings.create(
        model="text-embedding-3-small",
        input=[query],
    ).data[0].embedding

    result = supabase.rpc("match_chunks", {
        "query_embedding": query_embedding,
        "match_user_id":   user_id,
        "match_count":     top_k,
    }).execute()

    return [row["chunk_text"] for row in (result.data or [])]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/classify")
async def classify_endpoint(req: ClassifyRequest):
    """
    Classifies a document based on its extracted text.
    Call this after text extraction but before /process if the user didn't
    manually select a document type, or to confirm/override their selection.
    
    Returns: { doc_type, confidence, reason }
    """
    if not req.raw_text.strip():
        raise HTTPException(status_code=422, detail="raw_text is empty — nothing to classify.")

    result = classify_document(req.raw_text)
    return result


@app.post("/extract")
async def extract_endpoint(req: ExtractRequest):
    """
    Extracts structured JSON data from document text for a given doc_type.
    This feeds the Appointment Manager cards, Medication Hub, etc.
    
    Returns a JSON object whose shape depends on doc_type — see EXTRACTION_SCHEMAS.
    """
    if not req.raw_text.strip():
        raise HTTPException(status_code=422, detail="raw_text is empty — nothing to extract.")

    valid_types = list(EXTRACTION_SCHEMAS.keys())
    if req.doc_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"doc_type must be one of: {', '.join(valid_types)}",
        )

    structured = extract_structured_data(req.raw_text, req.doc_type)
    return {
        "document_type": req.doc_type,
        "extracted":     structured,
    }


@app.post("/process")
async def process_document(req: ProcessRequest):
    """
    Full pipeline:
      1. Download file from Supabase signed URL
      2. Extract raw text (PDF or OCR via Tesseract)
      3. Classify doc type (uses user-provided type but also runs AI check)
      4. Extract structured data
      5. Simplify (plain English, isolated step)
      6. Translate if needed (isolated step with medical guardrails)
      7. Save raw_text + summary back to Supabase documents table
      8. Chunk and embed for RAG memory
      9. Return everything to the frontend
    """
    # 1. Download
    file_bytes = download_file(req.file_url)

    # 2. Extract text
    raw_text = extract_text(file_bytes, req.storage_path)
    if not raw_text:
        raise HTTPException(
            status_code=422,
            detail="No text could be extracted from this document. Try a clearer scan or a text-based PDF.",
        )

    # 3. Classify — run AI classification and compare with user's selection.
    #    We trust AI classification if confidence is high; otherwise keep
    #    the user's manual selection. This way we get the best of both.
    classification = classify_document(raw_text)
    effective_type = (
        classification["doc_type"]
        if classification["confidence"] == "high"
        else req.file_type     # fall back to the user's manual dropdown choice
    )

    # 4. Structured extraction — result feeds Appointment Manager / Medication Hub.
    structured_data = extract_structured_data(raw_text, effective_type)

    # 5. Simplify — plain English only, no translation yet
    simplified_english = simplify(raw_text, effective_type)

    # 6. Translate — isolated step with medical guardrails, skipped if language is 'en'
    final_summary = translate(simplified_english, req.language)

    # 7. Save results back to Supabase ← ADDED
    supabase.table("documents").update({
        "raw_text": raw_text[:10000],   # column name confirmed: raw_text
        "summary":  final_summary,       # column name confirmed: summary
        "status":   "processed",
    }).eq("id", req.document_id).execute()

    # 8. Chunk and embed for RAG memory ← ADDED
    user_id = req.document_id  # swap this for real user_id once auth is wired
    chunk_and_embed(req.document_id, user_id, raw_text, effective_type)

    # 9. Return full payload to frontend
    return {
        "document_id":       req.document_id,
        "doc_type":          effective_type,
        "classification":    classification,
        "structured_data":   structured_data,
        "summary":           final_summary,
        "summary_english":   simplified_english,
        "char_count":        len(raw_text),
        "status":            "processed",
        "raw_text":          final_summary,  # legacy key for SuccessScreen
    }

  

class TranslateRequest(BaseModel):
    text:     str
    language: str  # ur | hi | ar | fr | es | pl | pt etc.

@app.post("/translate")
async def translate_endpoint(req: TranslateRequest):
    """
    Translates already-simplified English text into the requested language.
    Called by Results.jsx when the user switches the language dropdown.
    """
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="text is empty.")

    translated = translate(req.text, req.language)
    return { "translated": translated }

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    # 1. Retrieve relevant chunks from ALL user documents (RAG memory)
    context_chunks = retrieve_relevant_chunks(
        user_id=req.user_id,
        query=req.message,
    )
    context_text = "\n\n---\n\n".join(context_chunks) if context_chunks else "No relevant past records found."

    # 2. Load recent chat history from Supabase (persistent across sessions)
    history_result = (
        supabase.table("chat_history")
        .select("role, content")
        .eq("user_id", req.user_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    past_turns = list(reversed(history_result.data or []))

    # 3. System prompt with retrieved health context
    system_prompt = f"""You are CareBridge AI, a warm and careful health communication 
assistant for immigrant families and people with low health literacy.

You have access to the user's relevant past health records from their uploaded documents:

===== RELEVANT HEALTH CONTEXT =====
{context_text}
===== END OF CONTEXT =====

Use this context to connect patterns across time. If past records mention heartburn 
and the user now reports chest pain or vomiting, flag that connection clearly.

Rules:
1. Answer in simple plain language a 14-year-old could understand.
2. If you spot a symptom pattern that could be serious, say so clearly and advise seeing a doctor.
3. Never diagnose. Never tell the user to start or stop any medication.
4. If context doesn't cover the question, say so and suggest they ask their doctor.
5. Include 2-3 "Questions to ask your doctor" as bullet points ending in "?" when relevant.
6. Always end with: "If you are worried, please contact your GP or call 111."
"""

    messages = [{"role": "system", "content": system_prompt}]
    for turn in past_turns:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": req.message})

    # 4. Call GPT
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=500,
        messages=messages,
        temperature=0.3,
    )
    reply = response.choices[0].message.content.strip()

    # 5. Save turn to Supabase for persistence
    supabase.table("chat_history").insert([
        {"user_id": req.user_id, "document_id": req.document_id, "role": "user",      "content": req.message},
        {"user_id": req.user_id, "document_id": req.document_id, "role": "assistant", "content": reply},
    ]).execute()

    return {"reply": reply}