const OpenAI = require("openai");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Home = require('../models/home');
const rootDir = require('../utils/pathUtil');

require('dotenv').config();

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN
});

exports.generateRules = async (req, res, next) => {
  const { homeId, rawRules } = req.body;

  try {
    const home = await Home.findById(homeId);
    if (!home) return res.status(404).json({ message: "Venue not found" });

    // 1. Ask AI to write the formal rules
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a legal assistant for a venue host." },
        { role: "user", content: `Convert these notes into a formal 'House Rules' document for venue '${home.housename}': "${rawRules}"` }
      ],
      model: "gpt-4o", 
      temperature: 0.7,
    });

    const generatedText = response.choices[0].message.content;

    // 2. Generate the PDF
    const doc = new PDFDocument();
    const fileName = `rules-${homeId}-${Date.now()}.pdf`;
    const filePath = path.join(rootDir, 'uploads', 'rules', fileName);

    // Ensure directory exists
    const rulesDir = path.join(rootDir, 'uploads', 'rules');
    if (!fs.existsSync(rulesDir)) fs.mkdirSync(rulesDir, { recursive: true });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('Eventify Venue Rules', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(generatedText, { align: 'left', lineGap: 4 });
    doc.end();

    // 3. Save to DB after file is written
    stream.on('finish', async () => {
      // FIX: Force forward slashes for URL compatibility (Essential for Windows)
      home.rulesPdfUrl = `uploads/rules/${fileName}`; 
      
      await home.save();
      console.log("PDF Generated and Saved to:", home.rulesPdfUrl);

      res.json({ 
        success: true, 
        message: "Rules generated successfully!",
        pdfUrl: home.rulesPdfUrl 
      });
    });

  } catch (err) {
    console.error("AI Generation Error:", err);
    res.status(500).json({ success: false, message: "Failed to generate rules." });
  }
};