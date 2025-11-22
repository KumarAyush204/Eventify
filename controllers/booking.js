// In your Booking Controller
const Booking = require('../models/booking');
const Home = require('../models/home');

exports.postBooking = async (req, res, next) => {
  const { homeId, startDate, endDate, guestCount } = req.body;

  try {
    // 1. Convert strings to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 2. CHECK AVAILABILITY (The Critical Query)
    const conflictingBooking = await Booking.findOne({
      homeId: homeId,
      status: 'confirmed', // Only check valid bookings
      $or: [
        // Logic: (StartA < EndB) and (EndA > StartB)
        {
          startDate: { $lt: end },
          endDate: { $gt: start }
        }
      ]
    });

    if (conflictingBooking) {
      return res.status(400).json({ 
        message: "This property is already booked for the selected dates." 
      });
    }

    // 3. Fetch Home to get price
    const home = await Home.findById(homeId);
    
    // 4. Calculate Total Price
    // Difference in time / (1000 * 3600 * 24) to get days
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1; 
    const totalPrice = days * home.price;

    // 5. Create Booking
    const newBooking = new Booking({
      homeId,
      custId: req.user._id, // Assuming you have authentication middleware
      startDate: start,
      endDate: end,
      totalPrice: totalPrice,
      guestCount: guestCount,
      // ... allow user to fill other details or fetch from User model
      customername: req.user.firstname,
      customernumber: req.body.phone, // or from user profile
      customeremail: req.user.email
    });

    await newBooking.save();
    res.status(201).json({ message: "Booking confirmed!", booking: newBooking });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Booking failed" });
  }
};