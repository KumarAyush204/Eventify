const OpenAI = require("openai");
const fs = require('fs');
const path = require('path');
// NEW: Import standard PDF.js library
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const Home = require('../models/home');
const rootDir = require('../utils/pathUtil');

require('dotenv').config();

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN
});

exports.chatWithVenue = async (req, res, next) => {
  try {
    const { homeId, userMessage } = req.body;
    console.log(`\n--- Chat Request for Home ID: ${homeId} ---`);

    // 1. Fetch Venue Data
    const home = await Home.findById(homeId);
    if (!home) return res.status(404).json({ reply: "Venue not found." });

    let context = `
    You are a helpful assistant for the venue named "${home.housename}".
    Address: ${home.address}
    Capacity: ${home.capacity} guests
    Venue Type: ${home.venueType}
    Price: ₹${home.price} per day
    Facilities: ${home.facilities}
    `;

    // 2. ROBUST PDF LOGIC (using pdfjs-dist)
    if (home.rulesPdfUrl) {
      const pdfPath = path.join(rootDir, home.rulesPdfUrl);
      
      if (fs.existsSync(pdfPath)) {
        console.log("3. File found! Attempting to parse with pdfjs-dist...");
        
        try {
          // Read file as a Uint8Array (required by pdfjs)
          const dataBuffer = fs.readFileSync(pdfPath);
          const uint8Array = new Uint8Array(dataBuffer);

          // Load the document
          const loadingTask = pdfjsLib.getDocument(uint8Array);
          const pdfDocument = await loadingTask.promise;
          
          let fullText = "";

          // Loop through all pages to extract text
          for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(" ");
            fullText += pageText + "\n";
          }

          if (fullText.trim().length > 0) {
            context += `\nIMPORTANT: Here are the specific House Rules:\n${fullText}`;
            console.log(`SUCCESS: Extracted ${fullText.length} characters from PDF.`);
          } else {
            console.log("WARNING: PDF text is empty (It might be a scanned image).");
          }

        } catch (pdfError) {
          console.error("PDF Parse Error:", pdfError.message);
        }
      } else {
        console.log("Error: PDF file missing from disk.");
      }
    }

    // 3. Call AI
    console.log("--- Calling AI Model ---");
    const response = await client.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: `
            ${context}
            INSTRUCTIONS: Answer strictly based on the venue details and rules above.
          ` 
        },
        { role: "user", content: userMessage }
      ],
      model: "gpt-4o", 
      temperature: 0.5,
    });

    res.json({ reply: response.choices[0].message.content });

  } catch (err) {
    console.error("AI Chat Error:", err);
    res.status(500).json({ reply: "I'm having trouble connecting right now." });
  }
};