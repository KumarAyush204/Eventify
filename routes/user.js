// const path=require('path');
const express=require('express')
// const rootDir=require("../utils/pathUtil");
// const { registeredHomes } = require('./host');
const userController=require("../controllers/userController");
const chatController = require('../controllers/chatController');
const userRouter=express.Router();
userRouter.get("/", userController.getIndex);
//userRouter.get('/homes',userController.getUser)
userRouter.get('/bookings',userController.getBookings)
userRouter.get('/home-detail/:homeId',userController.getHomeDetails)
userRouter.get('/favourites',userController.getFavoriteList)
userRouter.post('/favourites',userController.postAddToFav)
userRouter.post('/favourites/delete/:homeId',userController.postDelFavList)
userRouter.post('/api/chat', chatController.chatWithVenue);
module.exports=userRouter; 
userRouter.get("/rules/:homeId",userController.getHouseRules);

userRouter.get("/book/:homeId",userController.getbookHouse);
userRouter.post("/book/:homeId",userController.postbookHouse);

