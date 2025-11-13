// src/aiService.js


import fetch from 'node-fetch';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1';

// -------------------------
// Helper: Sanitize word input
// -------------------------
function sanitizeWord(text) {
  if (!text) return '';
  const cleaned = text.replace(/[^A-Za-z\- ]+/g, '').trim();
  const token = cleaned.split(' ')[0] || '';
  return token.toLowerCase();
}

// -------------------------
// Helper: Calculate cosine similarity
// -------------------------
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// -------------------------
// Helper: Scale similarity for better UX
// -------------------------
function scaleSimilarity(rawScore) {
  if (rawScore < 0.3) {
    return rawScore * 0.9; // Bad guesses stay low
  } else if (rawScore >= 0.3 && rawScore < 0.4) {
    return rawScore + 0.05; // Mediocre: tiny boost
  } else if (rawScore >= 0.4 && rawScore < 0.5) {
    const boost = 0.10 + (rawScore - 0.4) * 0.5;
    return rawScore + boost;
  } else if (rawScore >= 0.5 && rawScore < 0.6) {
    const boost = 0.15 + (rawScore - 0.5) * 0.5;
    return rawScore + boost;
  } else if (rawScore >= 0.6 && rawScore < 0.7) {
    const boost = 0.20 + (rawScore - 0.6) * 1.0;
    return rawScore + boost;
  } else {
    const boost = 0.30 + (rawScore - 0.7) * 0.5;
    return Math.min(rawScore + boost, 1.0);
  }
}

// -------------------------
// Function: Generate Word
// -------------------------
export async function generateWord(category) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set in environment');
  }

  const prompt = `Provide exactly one single English word related to the category '${category}'.
- The word should be 4 to 9 letters long if possible, and something people might guess in a word association game.
- Return ONLY the word, without explanation, punctuation, or quotes.`;

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 10
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    const word = sanitizeWord(data.choices[0].message.content);
    
    if (!word) {
      throw new Error('OpenAI returned empty word');
    }

    return {
      category,
      word,
      source: 'openai-gpt4o-mini'
    };
  } catch (error) {
    console.error('Generate word error:', error);
    
    // Fallback words if API fails
    const fallbackWords = {
      music: ['guitar', 'piano', 'drums', 'violin', 'melody'],
      sports: ['soccer', 'tennis', 'basketball', 'swimming'],
      food: ['pizza', 'pasta', 'burger', 'salad'],
      animals: ['elephant', 'dolphin', 'tiger', 'penguin'],
      nature: ['forest', 'ocean', 'mountain', 'river'],
      technology: ['computer', 'robot', 'internet', 'software']
    };

    const words = fallbackWords[category.toLowerCase()] || ['word'];
    const randomWord = words[Math.floor(Math.random() * words.length)];

    return {
      category,
      word: randomWord,
      source: 'fallback',
      note: 'OpenAI unavailable - using fallback'
    };
  }
}

// -------------------------
// Function: Get Embedding
// -------------------------
async function getEmbedding(text) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set in environment');
  }

  const response = await fetch(`${OPENAI_API_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI embeddings API error');
  }

  return data.data[0].embedding;
}

// -------------------------
// Function: Calculate Similarity
// -------------------------
export async function calculateSimilarity(word1, word2) {
  const w1 = sanitizeWord(word1);
  const w2 = sanitizeWord(word2);

  if (!w1 || !w2) {
    throw new Error('Both word1 and word2 are required');
  }

  try {
    // Get embeddings for both words
    const [embedding1, embedding2] = await Promise.all([
      getEmbedding(w1),
      getEmbedding(w2)
    ]);

    // Calculate cosine similarity
    const rawScore = cosineSimilarity(embedding1, embedding2);
    
    // Scale for better gameplay
    const scaledScore = scaleSimilarity(rawScore);

    return {
      word1: w1,
      word2: w2,
      similarity: Math.round(scaledScore * 1000) / 1000,
      raw_similarity: Math.round(rawScore * 1000) / 1000,
      source: 'openai-text-embedding-3-small'
    };
  } catch (error) {
    console.error('Similarity calculation error:', error);
    throw error;
  }
}