import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch"; // install this if needed: npm i node-fetch

const app = express();
app.use(bodyParser.json());

// Example route to test AI communication
app.post("/api/guess", async (req, res) => {
  const { word } = req.body;

  try {
    // Use the Docker service name here
    const response = await fetch("http://ai_service:5000/similarity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input_word: word })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error contacting AI service:", error);
    res.status(500).json({ error: "AI service unreachable" });
  }
});

app.listen(3000, () => {
  console.log("Web service running on port 3000");
});
