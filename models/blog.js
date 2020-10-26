var mongoose = require('mongoose');
var Comment  = require('./comment');

var blogSchema = new mongoose.Schema({       
    title:String,
    image:String,
    content:String,
    created:{
        type:Date,
        default:Date.now
    },
    creator: {
        userId : {
            type:mongoose.Schema.Types.ObjectId,
            ref:"user"           
        },
        username : String
    },
    comments:[                     
                {
                    type:mongoose.Schema.Types.ObjectId,
                    ref:"comment"           
                }
            ],
    likes: []
});
module.exports = mongoose.model("blog",blogSchema); 