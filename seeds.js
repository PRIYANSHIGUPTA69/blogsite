var mongoose = require('mongoose');
var Blog     = require('./models/blog');
var Comment  = require('./models/comment');

var sampleData = [                                  //sample data to initialise
    {
        title:'World War 3',
        image:'img1',
        content:'end is near guys'
    },
    {
        title:'life',
        image:'img2',
        content:'life is really fun stuff'
    },
    {
        title:'money',
        image:'img3',
        content:'happy with our money right'
    }
];

var sampleComment = {                                     //sample comment for association to blogs
    text:"this is awesome",
    author:"saurabh"
}

function seedDB(){
    Blog.remove({},function(err){                                     //remove blogs data
        if(err){
            console.log(err);
        }
        else{
            console.log('removed all blogs');
            Comment.remove({},function(err){                          //remove comments data
                if(err){
                    console.log(err);
                }
                else{
                    console.log('removed all comments'); 
                    sampleData.forEach(function(seed){                         //add blog data 
                        Blog.create(seed,function(err,blog){
                            if(err){
                                console.log(err);
                            }
                            else{
                                console.log('blog added');        
                                Comment.create(sampleComment,function(err,newcomment){   //associates sample comment
                                    if(err){
                                        console.log(err);
                                    }
                                    else{
                                        blog.comments.push(newcomment);
                                        blog.save();
                                        console.log('comment added');
                                    }
                                });
                            }
                        });
                    });
                }
            });
        }
    });
}

module.exports = seedDB;