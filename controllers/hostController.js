const Home = require("../models/home");
const User = require('../models/user');
const Booking = require("../models/booking"); // Essential for 'View Bookings'
const fs = require('fs');
const path = require('path'); 

exports.getHost = (req, res, next) => {
  res.render('host/edit-home', {
    pageTitle: "Add Venue",
    title: 'form',
    editing: false, 
    isLoggedIn: req.isLoggedIn,
    user: {}
  });
};

exports.postHost = async (req, res, next) => {
  try {
    const { 
      housename, 
      address, 
      price, 
      rating, 
      facilities, 
      hostEmail, 
      capacity, 
      venueType 
    } = req.body;

    const images = req.files?.photoUrl;
    if (!images || images.length === 0) {
      return res.status(422).send("No image provided");
    }
    
    // Fix Windows paths to forward slashes
    const photoUrl = images[0].path.replace(/\\/g, "/");

    let rulesPdfUrl = null;
    if (req.files?.houseRulesPdf && req.files.houseRulesPdf.length > 0) {
      rulesPdfUrl = req.files.houseRulesPdf[0].path.replace(/\\/g, "/");
    }

    const user = await User.findOne({ email: hostEmail });
    if (!user) return res.status(404).send("Host user not found (Email does not match)");

    const home = new Home({
      housename,
      address,
      capacity,
      venueType,
      price,
      rating,
      photoUrl,
      facilities,
      hostEmail,
      host: user._id,
      rulesPdfUrl,
    });

    await home.save();
    console.log('Venue added successfully');
    res.redirect('/home-list');

  } catch(err) {
    console.log('Error adding venue:', err);
    next(err);
  }
};

exports.getHostList = async (req, res, next) => {
  try {
    if (!req.session?.isLoggedIn || !req.session?.user) {
      return res.redirect("/login");
    }

    const hostId = req.session.user._id; 
    const registeredHomes = await Home.find({ host: hostId });

    res.render("host/host-home-list", {
      homes: registeredHomes,
      pageTitle: "My Properties",
      isLoggedIn: req.session.isLoggedIn,
      user: req.session.user
    });
  } catch (err) {
    console.error("Error fetching host venues:", err);
    next(err);
  }
};

exports.getEditHome = (req, res, next) => {
  const homeId = req.params.homeId;
  const editing = req.query.editing === 'true';

  Home.findById(homeId).then(home => {
    if (!home) {
      return res.redirect("/host-home-list");
    }
    res.render("host/edit-home", {
      home: home,
      pageTitle: "Edit your Venue",
      currentPage: "host-homes",
      editing: editing,
      isLoggedIn: req.isLoggedIn,
      user: req.session.user || {}
    });
  });
};

exports.postEditHome = async (req, res, next) => {
  try {
    const { 
      id, 
      housename, 
      address, 
      price, 
      rating, 
      facilities, 
      hostEmail,
      capacity,    
      venueType    
    } = req.body;

    const images = req.files?.photoUrl;        
    const pdfs = req.files?.houseRulesPdf;    

    const home = await Home.findById(id);
    if (!home) {
      return res.redirect('/host-home-list');
    }

    // Update Text Fields
    home.housename = housename;
    home.address = address;
    home.capacity = capacity;
    home.venueType = venueType;
    home.price = price;
    home.rating = rating;
    home.facilities = facilities;
    home.hostEmail = hostEmail;

    // 1. Handle New Image Upload
    if (images && images.length > 0) {
      // Optional: Delete old image file here if needed
      home.photoUrl = images[0].path.replace(/\\/g, "/");
    }

    // 2. Handle New PDF Upload (Manual Override)
    // Only overwrite if the user actually selected a file
    if (pdfs && pdfs.length > 0) {
      // Fix Windows path issues
      home.rulesPdfUrl = pdfs[0].path.replace(/\\/g, "/");
    }

    await home.save();
    console.log('Venue updated successfully');
    res.redirect('/home-list');

  } catch (err) {
    console.log('Error while updating venue:', err);
    next(err);
  }
};

exports.postDeleteHome = (req, res, next) => {
  const homeId = req.params.homeId;
  Home.findOneAndDelete({ _id: homeId }).then(() => {
    res.redirect("/host-home-list");
  }).catch(error => {
    console.log('Error while deleting:', error);
    next(error);
  });
};

// New Function: View Bookings for a specific venue
exports.getHostBookings = async (req, res, next) => {
  const homeId = req.params.homeId;
  try {
    // Verify ownership
    const home = await Home.findOne({ _id: homeId, host: req.session.user._id });
    
    if (!home) {
      return res.redirect('/host-home-list');
    }

    const bookings = await Booking.find({ homeId: homeId }).sort({ startDate: 1 });

    res.render('host/host-bookings', {
      pageTitle: `Bookings for ${home.housename}`,
      bookings: bookings,
      home: home,
      isLoggedIn: req.session.isLoggedIn,
      user: req.session.user
    });
  } catch (err) {
    console.log("Error fetching host bookings:", err);
    next(err);
  }
};