// const path=require('path');
const express=require('express')
const hostRouter=express.Router();
// const rootDir=require("../utils/pathUtil");
const hostController=require("../controllers/hostController");
const aiController = require('../controllers/aiController');
hostRouter.post('/host/generate-rules-ai', aiController.generateRules);
hostRouter.get('/host/bookings/:homeId', hostController.getHostBookings);
hostRouter.get('/add-home',hostController.getHost)  
hostRouter.post('/add-home',hostController.postHost)
hostRouter.get('/home-list',hostController.getHostList)
hostRouter.get('/host/edit-home/:homeId',hostController.getEditHome)
hostRouter.post('/edit-home',hostController.postEditHome)
hostRouter.post("/delete-home/:homeId",hostController.postDeleteHome);
exports.hostRouter=hostRouter;
