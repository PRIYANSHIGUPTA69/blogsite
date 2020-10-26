var mongoose = require('mongoose');

var commentSchema = new mongoose.Schema({   
    text:String,
    creator: {
        userId : {
            type:mongoose.Schema.Types.ObjectId,
            ref:"user"           
        },
        username : String
    },
    created:{
        type:Date,
        default:Date.now
    }    
});

module.exports = mongoose.model("comment",commentSchema); 