// models/booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  homeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Home",   
    required: true
  },
  custId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // Snapshot of customer details at time of booking
  customername: { type: String, required: true },
  customernumber: { type: Number, required: true },
  customeremail: { type: String, required: true },
  
  // --- NEW CORE LOGIC ---
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  
  totalPrice: { type: Number, required: true }, // Calculated as: (Days * PricePerDay)
  
  status: { 
    type: String, 
    enum: ['confirmed', 'cancelled', 'completed'], 
    default: 'confirmed' 
  },
  
  // Renamed 'noofguests' to 'guestCount' (optional, but cleaner)
  guestCount: { type: Number, required: true }, 
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);