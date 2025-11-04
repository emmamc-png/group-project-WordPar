# ai_service.py
# Flask microservice that:
#  - generates a single word for a given category (OpenAI)
#  - computes semantic similarity between two words (OpenAI embeddings or sentence-transformers fallback)

import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from openai import OpenAI
from sentence_transformers import SentenceTransformer, util
from dotenv import load_dotenv

# -------------------------
# Load environment
# -------------------------
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# -------------------------
# Initialize OpenAI + fallback model
# -------------------------
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

print("Loading sentence-transformers fallback model (intfloat/e5-large-v2)...")
local_model = SentenceTransformer("intfloat/e5-large-v2")
print("Model loaded and ready.")

# Flask setup
app = Flask(__name__)
CORS(app)

# -------------------------
# Helpers
# -------------------------
def sanitize_one_word(text: str) -> str:
    """Return only the first token of a text, letters only, trimmed."""
    if not text:
        return ""
    cleaned = re.sub(r"[^A-Za-z\- ]+", "", text).strip()
    token = cleaned.split()[0] if cleaned.split() else ""
    return token

def cosine_sim(v1, v2):
    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))

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
    GET /api/generate_word?category=music
    Response: {"category": "music", "word": "Beatles", "source":"openai"}
    """
    category = (request.args.get("category") or "").strip().lower()
    if not category:
        return jsonify({"error": "category query param required"}), 400

    prompt = (
        f"Provide exactly one single English word related to the category '{category}'.\n"
        "- The word should be 4 to 9 letters long if possible, and something people might guess in a word association game.\n"
        "- Return ONLY the word, without explanation, punctuation, or quotes.\n"
    )

    if client:
        try:
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
            print("OpenAI generation error:", e)
            return jsonify({"error": "AI generation failed", "details": str(e)}), 503

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
    JSON: {"word1": "guess", "word2": "secret"}
    Response: {"similarity": 0.742}
    """
    data = request.get_json() or {}
    w1 = sanitize_one_word(data.get("word1", "")).lower()
    w2 = sanitize_one_word(data.get("word2", "")).lower()

    if not w1 or not w2:
        return jsonify({"error": "Both 'word1' and 'word2' required"}), 400

    try:
        if client:  # Use OpenAI embeddings if available
            response = client.embeddings.create(
                model="text-embedding-3-large",
                input=[w1, w2]
            )
            emb1 = response.data[0].embedding
            emb2 = response.data[1].embedding
            score = cosine_sim(emb1, emb2)
            source = "openai-embeddings"
        else:
            emb1 = local_model.encode(w1, convert_to_tensor=True)
            emb2 = local_model.encode(w2, convert_to_tensor=True)
            score = util.cos_sim(emb1, emb2).item()
            source = "local-fallback"

        score = max(min(score, 1.0), -1.0)
        return jsonify({
            "word1": w1,
            "word2": w2,
            "similarity": round(float(score), 3),
            "source": source
        })

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
