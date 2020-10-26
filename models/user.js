var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var userSchema = new mongoose.Schema({  
    name:String,
    username:String,
    password:String,
    blogs:[                     
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"blog"           
        }
    ]    
});

userSchema.plugin(passportLocalMongoose);             //authentication connection

module.exports = mongoose.model("user",userSchema); 
