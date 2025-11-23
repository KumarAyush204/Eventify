const OpenAI = require("openai");
const PDFDocument = require('pdfkit');
const Booking = require('../models/booking');
const Home = require('../models/home');

require('dotenv').config();

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN
});

exports.generateVenueReport = async (req, res, next) => {
  const homeId = req.params.homeId;
  const { startDate, endDate } = req.query; // Read dates from URL

  try {
    const home = await Home.findById(homeId);
    if (!home) return res.redirect('/host-home-list');

    // 1. Build the Query
    let query = { homeId: homeId, status: 'confirmed' };
    let dateRangeText = "All Time";

    // If dates are selected, filter by them
    if (startDate && endDate) {
      query.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
      dateRangeText = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }

    const bookings = await Booking.find(query);

    // 2. Calculate Stats
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalGuests = bookings.reduce((sum, b) => sum + b.guestCount, 0);
    const averageRevenue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

    // 3. Ask AI for Insights (Contextualized by Date)
    let aiSummary = "No bookings found for this period.";
    
    if (totalBookings > 0) {
      const prompt = `
        I am a venue host for "${home.housename}". 
        Here are my stats for the period: ${dateRangeText}
        - Total Bookings: ${totalBookings}
        - Total Revenue: ₹${totalRevenue}
        - Total Guests Hosted: ${totalGuests}
        - Venue Capacity: ${home.capacity}
        - Price Per Day: ₹${home.price}

        Write a short "Performance Review" for this specific period.
        Then provide 2 strategic tips to improve future bookings.
      `;

      const response = await client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-4o",
        temperature: 0.7,
      });
      
      aiSummary = response.choices[0].message.content;
    }

    // 4. Generate PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Report-${home.housename}-${dateRangeText}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).fillColor('#b91c1c').text('Eventify Performance Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('black').text(`Venue: ${home.housename}`, { align: 'center' });
    
    // Show Date Range in PDF
    doc.fontSize(10).fillColor('gray').text(`Period: ${dateRangeText}`, { align: 'center' });
    doc.moveDown(2);

    // Stats Grid
    doc.fontSize(14).fillColor('black').text('Key Metrics', { underline: true });
    doc.moveDown(0.5);
    
    doc.fontSize(12);
    doc.text(`Total Revenue: Rs. ${totalRevenue}`);
    doc.text(`Total Bookings: ${totalBookings}`);
    doc.text(`Total Guests Hosted: ${totalGuests}`);
    doc.text(`Avg. Revenue per Event: Rs. ${averageRevenue}`);
    doc.moveDown(2);

    // AI Insights
    doc.fontSize(14).fillColor('#4338ca').text('AI Business Analysis', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('black').text(aiSummary, { align: 'left', lineGap: 4 });

    // Footer
    doc.moveDown(4);
    doc.fontSize(10).fillColor('gray').text('Generated automatically by Eventify AI.', { align: 'center' });

    doc.end();

  } catch (err) {
    console.error("Report Generation Error:", err);
    res.redirect(`/host/bookings/${homeId}`);
  }
};