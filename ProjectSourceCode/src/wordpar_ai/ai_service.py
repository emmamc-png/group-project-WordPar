# ai_service.py
# Flask microservice with improved semantic similarity

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
# Initialize OpenAI + better fallback model
# -------------------------
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Using a better model optimized for semantic similarity
print("Loading sentence-transformers similarity model (paraphrase-MiniLM-L6-v2)...")
local_model = SentenceTransformer("paraphrase-MiniLM-L6-v2")
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

def scale_similarity(raw_score):
    """
    Custom scaling for gameplay:
    - < 0.3: Keep low (bad guesses stay bad)
    - 0.4-0.5: +0.10-0.15 boost (decent guesses get small help)
    - 0.6-0.7: +0.20-0.30 boost (good guesses get rewarded!)
    - > 0.7: Even bigger boost for great guesses
    """
    if raw_score < 0.3:
        # Bad guesses: no boost, maybe slight penalty
        return raw_score * 0.9
    
    elif 0.3 <= raw_score < 0.4:
        # Mediocre: tiny boost
        return raw_score + 0.05
    
    elif 0.4 <= raw_score < 0.5:
        # Decent: 0.10-0.15 boost
        boost = 0.10 + (raw_score - 0.4) * 0.5  # Linear from 0.10 to 0.15
        return raw_score + boost
    
    elif 0.5 <= raw_score < 0.6:
        # Good: 0.15-0.20 boost
        boost = 0.15 + (raw_score - 0.5) * 0.5
        return raw_score + boost
    
    elif 0.6 <= raw_score < 0.7:
        # Very good: 0.20-0.30 boost (your request!)
        boost = 0.20 + (raw_score - 0.6) * 1.0  # Linear from 0.20 to 0.30
        return raw_score + boost
    
    else:  # >= 0.7
        # Excellent: 0.30+ boost
        boost = 0.30 + (raw_score - 0.7) * 0.5
        return min(raw_score + boost, 1.0)  # Cap at 1.0

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
            # Fallback to simple word list
            fallback_words = {
                "music": ["guitar", "piano", "drums", "violin", "melody"],
                "sports": ["soccer", "tennis", "basketball", "swimming"],
                "food": ["pizza", "pasta", "burger", "salad"],
                "animals": ["elephant", "dolphin", "tiger", "penguin"],
            }
            word = fallback_words.get(category, ["word"])[0]
            return jsonify({
                "category": category, 
                "word": word, 
                "source": "fallback",
                "note": "OpenAI unavailable - using fallback"
            })

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
    Response: {"similarity": 0.742, "raw_similarity": 0.591}
    """
    data = request.get_json() or {}
    w1 = sanitize_one_word(data.get("word1", "")).lower()
    w2 = sanitize_one_word(data.get("word2", "")).lower()

    if not w1 or not w2:
        return jsonify({"error": "Both 'word1' and 'word2' required"}), 400

    try:
        # Use local model (it's better for semantic similarity than OpenAI embeddings)
        emb1 = local_model.encode(w1, convert_to_tensor=True)
        emb2 = local_model.encode(w2, convert_to_tensor=True)
        raw_score = util.cos_sim(emb1, emb2).item()
        
        # Scale for better UX
        scaled_score = scale_similarity(raw_score)
        
        return jsonify({
            "word1": w1,
            "word2": w2,
            "similarity": round(float(scaled_score), 3),
            "raw_similarity": round(float(raw_score), 3),
            "source": "local-paraphrase-model"
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