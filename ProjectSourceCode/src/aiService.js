// src/aiService.js

import fetch from "node-fetch";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1";

// -------------------------
// Helper: Sanitize word input
// -------------------------
function sanitizeWord(text) {
  if (!text) return "";
  const cleaned = text.replace(/[^A-Za-z\- ]+/g, "").trim();
  const token = cleaned.split(" ")[0] || "";
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
    return rawScore * 0.9;
  } else if (rawScore >= 0.3 && rawScore < 0.4) {
    return rawScore + 0.05;
  } else if (rawScore >= 0.4 && rawScore < 0.5) {
    const boost = 0.1 + (rawScore - 0.4) * 0.5;
    return rawScore + boost;
  } else if (rawScore >= 0.5 && rawScore < 0.6) {
    const boost = 0.15 + (rawScore - 0.5) * 0.5;
    return rawScore + boost;
  } else if (rawScore >= 0.6 && rawScore < 0.7) {
    const boost = 0.2 + (rawScore - 0.6) * 1.0;
    return rawScore + boost;
  } else {
    const boost = 0.3 + (rawScore - 0.7) * 0.5;
    return Math.min(rawScore + boost, 1.0);
  }
}

// -------------------------
// TIER 1: Word Bank - 50+ words per category (PRIMARY)
// -------------------------
const WORD_BANK = {
  music: [
    "guitar",
    "piano",
    "drums",
    "violin",
    "flute",
    "trumpet",
    "bass",
    "melody",
    "rhythm",
    "jazz",
    "blues",
    "rock",
    "concert",
    "band",
    "chorus",
    "tempo",
    "acoustic",
    "electric",
    "harmony",
    "tune",
    "song",
    "album",
    "vinyl",
    "stereo",
    "note",
    "beat",
    "chord",
    "scale",
    "octave",
    "voice",
    "vocal",
    "lyric",
    "artist",
    "singer",
    "composer",
    "bassoon",
    "ballads",
    "symphony",
    "opera",
    "disco",
    "folk",
    "country",
    "reggae",
    "funk",
    "grunge",
    "indie",
    "studio",
    "stage",
    "festival",
    "encore",
  ],
  sports: [
    "soccer",
    "football",
    "sweeper",
    "baseball",
    "tennis",
    "golf",
    "hockey",
    "rugby",
    "cricket",
    "boxing",
    "tackling",
    "swimming",
    "diving",
    "skating",
    "skiing",
    "surfing",
    "cycling",
    "running",
    "marathon",
    "sprint",
    "relay",
    "jump",
    "throw",
    "catch",
    "kick",
    "pass",
    "goal",
    "score",
    "point",
    "win",
    "team",
    "coach",
    "player",
    "athlete",
    "champion",
    "trophy",
    "medal",
    "victory",
    "court",
    "field",
    "arena",
    "stadium",
    "track",
    "pool",
    "rink",
    "gym",
    "fitness",
    "training",
    "workout",
    "exercise",
  ],
  food: [
    "pizza",
    "pasta",
    "burger",
    "salad",
    "taco",
    "sushi",
    "rice",
    "bread",
    "cheese",
    "chicken",
    "steak",
    "fish",
    "shrimp",
    "lobster",
    "crab",
    "bacon",
    "eggs",
    "toast",
    "waffle",
    "pancake",
    "cereal",
    "oatmeal",
    "yogurt",
    "fruit",
    "apple",
    "banana",
    "orange",
    "grape",
    "berry",
    "melon",
    "peach",
    "mango",
    "carrot",
    "broccoli",
    "pepper",
    "onion",
    "garlic",
    "potato",
    "tomato",
    "soup",
    "stew",
    "curry",
    "noodle",
    "dumpling",
    "sandwich",
    "wrap",
    "bagel",
    "cookie",
    "cake",
    "pie",
    "brownie",
  ],
  animals: [
    "elephant",
    "dolphin",
    "tiger",
    "lion",
    "bear",
    "wolf",
    "fox",
    "deer",
    "rabbit",
    "squirrel",
    "mouse",
    "rat",
    "hamster",
    "guinea",
    "giraffe",
    "zebra",
    "monkey",
    "gorilla",
    "panda",
    "koala",
    "kangaroo",
    "penguin",
    "eagle",
    "hawk",
    "owl",
    "parrot",
    "crow",
    "swan",
    "duck",
    "goose",
    "shark",
    "whale",
    "seal",
    "otter",
    "turtle",
    "frog",
    "snake",
    "lizard",
    "spider",
    "firefly",
    "bee",
    "ant",
    "ladybug",
    "cricket",
    "beetle",
    "puppy",
    "kitten",
    "horse",
    "cow",
    "sheep",
  ],
  nature: [
    "forest",
    "jungle",
    "desert",
    "mountain",
    "valley",
    "canyon",
    "cliff",
    "ocean",
    "sea",
    "lake",
    "river",
    "stream",
    "creek",
    "pond",
    "waterfall",
    "beach",
    "shore",
    "coast",
    "island",
    "volcano",
    "glacier",
    "iceberg",
    "tree",
    "pine",
    "oak",
    "maple",
    "birch",
    "willow",
    "palm",
    "bamboo",
    "flower",
    "rose",
    "lily",
    "daisy",
    "tulip",
    "orchid",
    "blossom",
    "grass",
    "moss",
    "fern",
    "vine",
    "bush",
    "shrub",
    "garden",
    "meadow",
    "sky",
    "cloud",
    "rain",
    "snow",
    "wind",
    "storm",
  ],
  technology: [
    "computer",
    "laptop",
    "tablet",
    "phone",
    "android",
    "screen",
    "keyboard",
    "mouse",
    "monitor",
    "printer",
    "scanner",
    "camera",
    "video",
    "audio",
    "software",
    "hardware",
    "program",
    "app",
    "code",
    "data",
    "file",
    "folder",
    "internet",
    "website",
    "email",
    "browser",
    "search",
    "cloud",
    "server",
    "network",
    "wifi",
    "wireless",
    "cable",
    "charger",
    "battery",
    "power",
    "digital",
    "virtual",
    "online",
    "stream",
    "download",
    "upload",
    "backup",
    "robot",
    "drone",
    "gadget",
    "device",
    "tech",
    "cyber",
    "gaming",
  ],
};

// -------------------------
// TIER 3: Expanded Fallback Words - 30+ per category (EMERGENCY)
// -------------------------
const FALLBACK_WORDS = {
  music: [
    "guitar",
    "piano",
    "drums",
    "violin",
    "melody",
    "rhythm",
    "jazz",
    "blues",
    "rock",
    "concert",
    "band",
    "chorus",
    "tempo",
    "tune",
    "song",
    "album",
    "vinyl",
    "stereo",
    "note",
    "beat",
    "chord",
    "harmony",
    "acoustic",
    "electric",
    "voice",
    "vocal",
    "lyric",
    "artist",
    "singer",
    "festival",
    "encore",
  ],
  sports: [
    "soccer",
    "tennis",
    "ballgame",
    "swimming",
    "football",
    "baseball",
    "golf",
    "hockey",
    "rugby",
    "boxing",
    "marathon",
    "sprint",
    "relay",
    "jump",
    "throw",
    "goal",
    "score",
    "team",
    "coach",
    "player",
    "athlete",
    "champion",
    "trophy",
    "medal",
    "victory",
    "stadium",
    "arena",
    "gym",
    "fitness",
    "workout",
  ],
  food: [
    "pizza",
    "pasta",
    "burger",
    "salad",
    "taco",
    "sushi",
    "rice",
    "bread",
    "cheese",
    "chicken",
    "steak",
    "fish",
    "bacon",
    "eggs",
    "toast",
    "waffle",
    "cereal",
    "yogurt",
    "apple",
    "banana",
    "orange",
    "grape",
    "berry",
    "mango",
    "carrot",
    "pepper",
    "soup",
    "curry",
    "noodle",
    "sandwich",
    "cookie",
    "cake",
  ],
  animals: [
    "elephant",
    "dolphin",
    "tiger",
    "penguin",
    "lion",
    "bear",
    "wolf",
    "fox",
    "rabbit",
    "giraffe",
    "zebra",
    "monkey",
    "panda",
    "koala",
    "kangaroo",
    "eagle",
    "hawk",
    "owl",
    "parrot",
    "shark",
    "whale",
    "seal",
    "turtle",
    "frog",
    "snake",
    "spider",
    "firefly",
    "bee",
    "puppy",
    "kitten",
    "horse",
  ],
  nature: [
    "forest",
    "ocean",
    "mountain",
    "river",
    "jungle",
    "desert",
    "valley",
    "canyon",
    "lake",
    "stream",
    "geyser",
    "beach",
    "island",
    "volcano",
    "glacier",
    "tree",
    "flower",
    "rose",
    "garden",
    "meadow",
    "sky",
    "cloud",
    "rain",
    "snow",
    "wind",
    "storm",
    "sunset",
    "sunrise",
    "moon",
    "star",
    "rainbow",
  ],
  technology: [
    "computer",
    "robot",
    "internet",
    "software",
    "laptop",
    "tablet",
    "phone",
    "screen",
    "keyboard",
    "mouse",
    "printer",
    "camera",
    "app",
    "code",
    "data",
    "website",
    "email",
    "browser",
    "cloud",
    "server",
    "network",
    "wifi",
    "digital",
    "virtual",
    "online",
    "download",
    "backup",
    "drone",
    "gadget",
    "gaming",
  ],
};

// -------------------------
// Function: Generate Word (3-TIER SYSTEM)
// -------------------------
export async function generateWord(category) {
  const categoryLower = category.toLowerCase();

  // ==================================================
  // TIER 1: Try Word Bank first (PRIMARY - 99% of time)
  // ==================================================
  const wordBankWords = WORD_BANK[categoryLower];
  if (wordBankWords && wordBankWords.length > 0) {
    const randomIndex = Math.floor(Math.random() * wordBankWords.length);
    const randomWord = wordBankWords[randomIndex];

    console.log(
      `✅ TIER 1 - Word Bank: "${randomWord}" (${wordBankWords.length} options available)`
    );

    return {
      category,
      word: randomWord,
      source: "wordbank-tier1",
    };
  }

  // ==================================================
  // TIER 2: Try OpenAI if Word Bank doesn't have category (BACKUP)
  // ==================================================
  if (OPENAI_API_KEY) {
    console.log("🤖 TIER 2 - Word Bank empty, trying OpenAI API...");

    const prompt = `Provide exactly one single English word related to the category '${category}'.
- The word should be 4 to 10 letters long if possible.
- Return ONLY the word, without explanation, punctuation, or quotes.`;

    try {
      const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 1.2,
          max_tokens: 15,
          presence_penalty: 0.6,
          frequency_penalty: 0.6,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "OpenAI API error");
      }

      const word = sanitizeWord(data.choices[0].message.content);

      if (word) {
        console.log(`✅ TIER 2 - OpenAI generated: "${word}"`);
        return {
          category,
          word,
          source: "openai-tier2",
        };
      }
    } catch (error) {
      console.error("⚠️ TIER 2 - OpenAI failed:", error.message);
    }
  }

  // ==================================================
  // TIER 3: Fallback to expanded word list (EMERGENCY)
  // ==================================================
  console.log("📦 TIER 3 - Using fallback word list (emergency)");
  const fallbackWordList = FALLBACK_WORDS[categoryLower] || [
    "word",
    "game",
    "play",
    "star",
    "moon",
  ];
  const randomIndex = Math.floor(Math.random() * fallbackWordList.length);
  const randomWord = fallbackWordList[randomIndex];

  console.log(
    `✅ TIER 3 - Fallback: "${randomWord}" (${fallbackWordList.length} options available)`
  );

  return {
    category,
    word: randomWord,
    source: "fallback-tier3",
  };
}

// -------------------------
// Function: Get Embedding
// -------------------------
async function getEmbedding(text) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set in environment");
  }

  const response = await fetch(`${OPENAI_API_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-large",
      input: text,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI embeddings API error");
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
    throw new Error("Both word1 and word2 are required");
  }

  try {
    const [embedding1, embedding2] = await Promise.all([
      getEmbedding(w1),
      getEmbedding(w2),
    ]);

    const rawScore = cosineSimilarity(embedding1, embedding2);
    const scaledScore = scaleSimilarity(rawScore);

    return {
      word1: w1,
      word2: w2,
      similarity: Math.round(scaledScore * 1000) / 1000,
      raw_similarity: Math.round(rawScore * 1000) / 1000,
      source: "openai-text-embedding-3-large",
    };
  } catch (error) {
    console.error("Similarity calculation error:", error);
    throw error;
  }
}
