const mongoose=require('mongoose');
const favoriteSchema=mongoose.Schema({
  houseId:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'Home',
    requied:true,
    unique: true
  }
});
module.exports=mongoose.model('Favorite',favoriteSchema);