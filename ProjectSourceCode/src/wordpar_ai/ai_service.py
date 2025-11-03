# ai_service.py
# Flask microservice that:
#  - generates a single word for a given category (OpenAI)
#  - computes semantic similarity between two words (sentence-transformers)
#
# Usage:
# - set environment variables: OPENAI_API_KEY, DB_* if you later use Postgres
# - run: python ai_service.py
import openai
import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
from sentence_transformers import SentenceTransformer, util
from dotenv import load_dotenv

load_dotenv()  # load .env if present
# -------------------------
# Configuration (env vars)
# -------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OpenAI API key not set in environment")
 # required for generation route
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # change if needed

# -------------------------
# Initialize services
# -------------------------
# OpenAI setup (if OPENAI_API_KEY is not set the generate endpoint will fallback)
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

# Load semantic model once (keeps memory footprint lower than large transformers)
# all-MiniLM-L6-v2 is small and fine for word similarity
print("Loading sentence-transformers model (this may take ~30s on first run)...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model loaded.")

# Flask app
app = Flask(__name__)
CORS(app)

# -------------------------
# Helpers
# -------------------------
def sanitize_one_word(text: str) -> str:
    """Return only the first token of a text, letters only, trimmed."""
    if not text:
        return ""
    # Keep alphabetic characters and hyphen, drop punctuation
    cleaned = re.sub(r"[^A-Za-z\- ]+", "", text).strip()
    # return first token
    token = cleaned.split()[0] if cleaned.split() else ""
    return token

# -------------------------
# Endpoint: Health
# -------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

# -------------------------
# Endpoint: Generate Word
# -------------------------
@app.route("/api/generate_word", methods=["GET"])
def generate_word():
    """
    Request: GET /api/generate_word?category=music
    Response: { "category": "music", "word": "Beatles", "source":"openai" }
    - Uses OpenAI to request a single 7-9 letter word related to category.
    - If OpenAI fails or no API key, returns 503 or fallback (you will add DB fallback later).
    """
    category = (request.args.get("category") or "").strip().lower()
    if not category:
        return jsonify({"error": "category query param required"}), 400

    # prompt: ask the model to return a single word only
    prompt = (
        f"Provide exactly one single English word related to the category '{category}'.\n"
        "- The word should be 7 to 9 letters long if possible.\n"
        "- Return ONLY the word, without explanation, punctuation, or quotes.\n"
        "- If you cannot find any 7-9 letter word, return one close to that length.\n"
    )

    # if OPENAI_API_KEY available, try to generate
    if OPENAI_API_KEY:
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            resp = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.6,
                max_tokens=10,
            )
            text = resp.choices[0].message.content
            word = sanitize_one_word(text)
            if not word:
                raise ValueError("OpenAI returned empty or invalid word")
            return jsonify({"category": category, "word": word, "source": "openai"})
        except Exception as e:
            # log and send friendly message; fallback to error for now (DB fallback will be added later)
            print("OpenAI generation error:", e)
            return jsonify({"error": "AI generation failed", "details": str(e)}), 503

    # If no API key set, return 501 instructing user to set env var
    return jsonify({
        "error": "OpenAI API key not set on server.",
        "how_to_fix": "Set OPENAI_API_KEY environment variable and restart.",
    }), 501

# -------------------------
# Endpoint: Similarity
# -------------------------
@app.route("/api/similarity", methods=["POST"])
def similarity():
    """
    POST /api/similarity
    JSON body: {"word1": "guess", "word2": "secret"}
    Response: {"similarity": 0.742}
    """
    data = request.get_json() or {}
    w1 = (data.get("word1") or "").strip()
    w2 = (data.get("word2") or "").strip()

    if not w1 or not w2:
        return jsonify({"error": "Both 'word1' and 'word2' required"}), 400

    # normalize to lowercase and sanitize (we compare words)
    w1_clean = sanitize_one_word(w1).lower()
    w2_clean = sanitize_one_word(w2).lower()

    if not w1_clean or not w2_clean:
        return jsonify({"error": "Words must contain alphabetic characters"}), 400

    try:
        emb1 = model.encode(w1_clean, convert_to_tensor=True)
        emb2 = model.encode(w2_clean, convert_to_tensor=True)
        score = util.cos_sim(emb1, emb2).item()
        # clamp and round
        if score < -1.0: score = -1.0
        if score > 1.0: score = 1.0
        return jsonify({"similarity": round(float(score), 3), "word1": w1_clean, "word2": w2_clean})
    except Exception as e:
        print("Similarity error:", e)
        return jsonify({"error": "Similarity computation failed", "details": str(e)}), 500

# -------------------------
# Run app
# -------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"Starting AI service on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)