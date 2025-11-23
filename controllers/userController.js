const Home = require("../models/home");
const User=require("../models/user")
const Booking = require("../models/booking");
const path=require('path');
const rootDir=require('../utils/pathUtil');
const { release } = require("os");
const nodemailer = require("nodemailer");
require("dotenv").config();


exports.getIndex = (req, res, next) => {
  console.log("Session Value: ", req.session);
  Home.find().then((registeredHomes) => {
    res.render('index', {
      homes: registeredHomes,
      pageTitle: "Eventify Home",
      isLoggedIn: req.isLoggedIn,
      user:req.session.user
    });
  });
};

// exports.getUser=(req,res,next)=>{
//   console.log("Session Value: ", req.session);
//   Home.find().then(registeredHomes=>{
//   res.render('home-page', {pageTitle: "StayEasy Home", homes:registeredHomes, 
//     title: 'User Page',
//     isLoggedIn: req.isLoggedIn,
//     user:req.session.user });
//   })
// } 
exports.getBookings = async (req, res, next) => {
  try {
    const userId = req.session.user._id;

    // Fetch bookings and populate the 'homeId' field to get property details
    const bookings = await Booking.find({ custId: userId })
                                  .populate("homeId")
                                  .sort({ createdAt: -1 }); // Show newest first

    res.render("user/bookings", {
      pageTitle: "Your Bookings",
      bookings: bookings, // Passing the full booking objects
      user: req.session.user,
      isLoggedIn: req.isLoggedIn
    });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.render("user/bookings", {
      pageTitle: "Your Bookings",
      bookings: [],
      user: req.session.user,
      isLoggedIn: req.isLoggedIn,
      errorMessage: "Could not load bookings."
    });
  }
};

exports.getFavoriteList = async (req, res, next) => {
   const userId = req.session.user._id;
  const user = await User.findById(userId).populate('favourites');
  res.render("user/favorite-list", {
    favouriteHomes: user.favourites,
    pageTitle: "My Favourites",
    currentPage: "favourites",
    isLoggedIn: req.isLoggedIn, 
    user: req.session.user,
  });
};
exports.postAddToFav=async(req,res,next)=>{
  const homeId = req.body.id;
  const userId = req.session.user._id;
  const user = await User.findById(userId);
  if (!user.favourites.includes(homeId)) {
    user.favourites.push(homeId);
    await user.save();
  }
  res.redirect("/favourites");
};
exports.use404 = (req, res, next) => {
  res.status(404).render('404', {
    pageTitle: 'Page Not Found',        // Matches <%= pageTitle %> in 404.ejs
    message: 'We could not find the page you were looking for.',
    isLoggedIn: req.session.isLoggedIn, // Required for the Navbar
    user: req.session.user              // Required for the Navbar
  });
}
exports.getHomeDetails=(req,res,next)=>{
  const homeId=req.params.homeId;
  Home.findById(homeId).then(home=>{
    if(!home){
      res.redirect('404')
    }
    else{
    res.render('user/home-detail',{home: home,
      pageTitle:"Venue Detail",currentPage:"home",
      isLoggedIn: req.isLoggedIn,
      user:req.session.user
    })}
  })
}
exports.postDelFavList=async(req,res,next)=>{
  const homeId = req.params.homeId;
  const userId = req.session.user._id;
  const user = await User.findById(userId);
  if (user.favourites.includes(homeId)) {
    user.favourites = user.favourites.filter(fav => fav != homeId);
    await user.save();
  }
  res.redirect("/favourites");
};
exports.getHouseRules = [
  (req, res, next) => {
    if (!req.session.isLoggedIn) {
      return res.redirect("/login");
    }
    next();
  },
  (req, res) => {
    const filePath = path.join(rootDir, 'uploads', 'rules', 'HouseRules.pdf');
    res.download(filePath, 'HouseRules.pdf', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(404).send('File not found');
      }
    });
  } 
];

exports.getbookHouse=async (req,res,next)=>{
    if (!req.isLoggedIn) {
      // redirect to login page if user is not logged in
      return res.redirect("/login");
    }
  const homeId=req.params.homeId;
  const home = await Home.findById(homeId);
  const userId = req.session.user._id;
  const user = await User.findById(userId);
  res.render("user/Book", 
    {
    home:home,
    user:user,
    pageTitle: "Bookings",
    currentPage: "bookings",
    isLoggedIn: req.isLoggedIn, 
    user: req.session.user,
  });
};



exports.postbookHouse = async (req, res, next) => {
  try {
    const homeId = req.params.homeId;
    // 1. Extract NEW fields from the form
    const { 
      customername, 
      customernumber, 
      customeremail, 
      startDate, 
      endDate, 
      guestCount 
    } = req.body;

    // 2. Convert strings to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 3. CHECK AVAILABILITY (Prevent Double Booking)
    const conflictingBooking = await Booking.findOne({
      homeId: homeId,
      status: 'confirmed', 
      $or: [
        { startDate: { $lt: end }, endDate: { $gt: start } }
      ]
    });

    if (conflictingBooking) {
      const home = await Home.findById(homeId);
      
      // The render function MUST send 'errorMessage' for the view to show it
      return res.status(422).render("user/Book", {
        home: home,
        pageTitle: "Book Venue",
        isLoggedIn: req.isLoggedIn,
        user: req.session.user,
        
        // This is the variable the EJS file looks for:
        errorMessage: "This venue is already booked for the selected dates. Please choose different dates." 
      });
    }

    // 4. Fetch Home to calculate Total Price
    const home = await Home.findById(homeId);
    if (!home) return res.redirect('/');

    // Calculate days: (Difference in ms) / (ms per day)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1; 
    const totalPrice = days * home.price;

    // 5. Create the Booking Object
    const booking = new Booking({
      homeId,
      custId: req.session.user._id,
      customername,
      customernumber,
      customeremail,
      startDate: start,    // Saved as Date
      endDate: end,        // Saved as Date
      guestCount,
      totalPrice,          // Calculated
      status: 'confirmed'
    });

    await booking.save();
    console.log("Booking Saved Successfully");

    // 6. Send Email Notification (Existing Logic)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: home.hostEmail,
      subject: "New Event Booking Notification",
      text: `
      Hello Host,

      Your venue "${home.housename}" has been booked!

      Event Details:
      Guest Name: ${customername}
      Dates: ${startDate} to ${endDate}
      Total Guests: ${guestCount}
      Total Earnings: ₹${totalPrice}

      Please login to your dashboard to view details.
      `
    };

    await transporter.sendMail(mailOptions);

    // 7. Redirect to Payment or Success Page
    res.render("user/payment", {
      pageTitle: "Payment",
      currentPage: "payment",
      isLoggedIn: req.isLoggedIn, 
      user: req.session.user,
      booking: booking // Pass booking details if needed for receipt
    });

  } catch (err) {
    console.error("Booking Error:", err);
    res.status(500).send("Booking failed due to server error.");
  }
};