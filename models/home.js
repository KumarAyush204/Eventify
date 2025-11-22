// models/home.js
const mongoose = require("mongoose");
const favorite = require("./favorite"); // Keeping your existing delete hook dependency

const homeSchema = new mongoose.Schema({
  // Renamed 'housename' to 'name' for clarity, but you can keep 'housename' if frontend uses it
  housename: { type: String, required: true }, 
  address: { type: String, required: true },
  
  // NEW: Maximum number of guests the venue can hold
  capacity: { type: Number, required: true }, 
  
  // NEW: Type of venue (e.g., "Banquet Hall", "Farmhouse", "Conference Room")
  venueType: { type: String, default: "General" },

  price: { type: Number, required: true }, // Price PER DAY
  rating: { type: Number, default: 0 },
  photoUrl: String,
  facilities: { type: String, required: true }, // e.g., "DJ, Catering, Parking"
  rulesPdfUrl: { type: String },
  hostEmail: { type: String, required: true },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Keeping your existing hook to clean up favorites when a home is deleted
homeSchema.pre('findOneAndDelete', async function(next){
  console.log('pre hook executed');
  const homeId = this.getQuery()._id;
  await favorite.deleteMany({ houseId: homeId }); // Fixed typo 'hoseId' -> 'houseId'
  next();
});

module.exports = mongoose.model('Home', homeSchema);