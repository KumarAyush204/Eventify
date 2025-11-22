// const path=require('path');
// const rootDir=require("../utils/pathUtil");
const express=require('express')
const errorRouter=express.Router();
const userController=require("../controllers/userController");

errorRouter.use(userController.use404)
module.exports=errorRouter;
