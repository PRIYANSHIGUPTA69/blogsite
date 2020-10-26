////////////////////////////////////////// initials ///////////////////////////////////////////////
var express          = require('express'),
    bodyParser       = require("body-parser"),
    methodOverride   = require('method-override'),
    expressSanitizer = require('express-sanitizer'),
    flash            = require('connect-flash'),
    fetch            = require('node-fetch'),
    app = express(),
    mongoose = require('mongoose'),                              //DB requirements
    Blog = require('./models/blog'),
    Comment = require('./models/comment'),
    User = require('./models/user'),
    seedDB = require('./seeds'),                  
    passport              = require("passport"),                 //authentication
    localStrategy         = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose"),
    expressSession        = require("express-session");

//seedDB();                                     //DB seeding

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(expressSanitizer());
app.use(methodOverride("_method"));
app.use(flash());
////////////////////////////////////////// Authentication ///////////////////////////////////////////////
app.use(expressSession({                            
    secret:"rusty is the cutest dog",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){               //middleware runs before every route 
    res.locals.currentUser = req.user;        //currentUser getting the value of loggedin user
    res.locals.error       = req.flash('error');
    res.locals.success     = req.flash('success');
    next();                                  
});

////////////////////////////////////////// DB connection ///////////////////////////////////////////////
mongoose.connect("mongodb+srv://root:priyu123@cluster0.x9ktn.mongodb.net/blogAdda?retryWrites=true&w=majority",{useNewUrlParser: true,useUnifiedTopology: true});
////////////////////////////////////////// Routes ///////////////////////////////////////////////
// LANDING PAGE
app.get('/',function(req,res){
    res.render('landing.ejs')             //landing page
});

// INDEX - SHOW ALL BLOGS FROM DB
app.get('/blogs',function(req,res){
        Blog.find({},function(err,blogs){                  //finds & show all blogs from DB            
        if(err){
            res.redirect('back');
        }else{
            res.render('blogs/index.ejs',{blogs:blogs});             //index page
        }
    });
});

// NEW - DISPLAY FORM TO ADD NEW BLOG
app.get('/blogs/new',isLoggedIn,function(req,res){
    res.render('blogs/new.ejs');                       //show form to add a blog
});

// CREATE - ADD A NEW BLOG TO DB
app.post('/blogs',isLoggedIn,function(req,res){
    req.body.blog.content = req.sanitize(req.body.blog.content);
    Blog.create(req.body.blog,function(err,blog){      //fetch form data and saving to DB 
        if(err){
            console.log(err);
            res.redirect('back');
        }else{
            blog.creator.username = req.user.name;
            blog.creator.userId = req.user._id;
            //console.log('CREATED BLOG ---------'+blog);
            blog.save();
            User.findById(req.user._id,function(err,foundUser){          //finding current login user
                if(err){
                    console.log(err);
                    res.redirect('back');
                }
                else{
                    //console.log('ASSOCIATED USER ---------'+foundUser);
                    foundUser.blogs.push(blog);
                    foundUser.save();
                    req.flash('success','Blog created Successfully!');
                    res.redirect('/blogs');                  //redirect to index page
                }
            });
        }
    });
});

// SHOW - DISPLAY INFO ABOUT 1 BLOG
app.get('/blogs/:id',function(req,res){
    Blog.findById(req.params.id).populate('comments').exec(function(err,foundBlog){    //finds that particular blog             
        if(err || !foundBlog){
            req.flash('error','Blog Not Found!!');
            res.redirect('/blogs');
        }else{
            res.render('blogs/show.ejs',{blog:foundBlog});               //show page
        }
    });
});

// EDIT - EDITS PARTICULAR BLOG (combination of SHOW & NEW)
app.get('/blogs/:id/edit',checkBlogOwnership,function(req,res){
    Blog.findById(req.params.id,function(err,foundBlog){                 //finds that particular blog               
        if(err){
            res.redirect('/blogs');
        }else{
            res.render('blogs/edit.ejs',{blog:foundBlog});                  //show form to edit that particular blog
        }
    });
});

// UPDATE - UPDATE PARTICULAR BLOG (combination of CREATE & SHOW)
app.put('/blogs/:id',checkBlogOwnership,function(req,res){
    req.body.blog.content = req.sanitize(req.body.blog.content);
    Blog.findByIdAndUpdate(req.params.id,req.body.blog,function(err,updatedBlog){  
        if(err){                         //find that particular blog & fetch its data, and update to DB         
            res.redirect('/blogs');
        }else{
            req.flash('success','Blog updated Successfully!');
            res.redirect('/blogs/'+req.params.id);                   //redirect to show page
        }
    });
});

// DESTROY - DELETE PARTICULAR BLOG 
app.delete('/blogs/:id',checkBlogOwnership,function(req,res){
    Blog.findById(req.params.id,function(err,foundBlog){    //finding blog
        if(err){
            res.redirect('/blogs');
        }
        else{
            //console.log('FOUND BLOG ------ '+foundBlog);       
            foundBlog.comments.forEach(function(comment_id){        
                Comment.findByIdAndRemove(comment_id,function(err){      //removing associated comments 
                    if(err){
                        console.log(err);
                        return res.redirect('back');
                    }
                    //console.log('comment removed');
                });
            });
            User.findById(foundBlog.creator.userId,function(err,associatedUser){    //finding associated user
                if(err){
                    console.log(err);
                    res.redirect('back');
                }
                else{
                    //console.log('(before) ASSOCIATED USER ------ '+associatedUser);
                    var index = associatedUser.blogs.indexOf(foundBlog._id);
                    associatedUser.blogs.splice(index,1);                  //removing blog-id from user blogs array
                    associatedUser.save();
                    //console.log('(after) ASSOCIATED USER ------ '+associatedUser);
                    foundBlog.remove();                                    //removing blog
                    req.flash('success','Blog Deleted Successfully!');
                    res.redirect('/blogs');            //redirect to index page
                }
            });
        }
    });
});

// ==========================================================
//                       COMMENT ROUTES
// ==========================================================

// NEW - DISPLAY FORM TO ADD NEW COMMENT
app.get('/blogs/:id/comments/new',isLoggedIn,function(req,res){
    Blog.findById(req.params.id,function(err,foundBlog){         //finds that particular blog 
        if(err || !foundBlog){
            req.flash('error','Blog Not Found!!');
            res.redirect('/blogs');
        }
        else{
            res.render('comments/new.ejs',{blog:foundBlog});                       //show form to add a comment
        }
    });
});

// CREATE - ADD A NEW COMMENT TO DB
app.post('/blogs/:id/comments',isLoggedIn,function(req,res){
    Blog.findById(req.params.id,function(err,foundBlog){         //finds that particular blog 
        if(err || !foundBlog){
            req.flash('error','Blog Not Found!!');
            res.redirect('/blogs');
        }
        else{
            //console.log('FOUND BLOG ---------'+foundBlog);
            Comment.create(req.body.comment,function(err,newComment){      //fetch form data and saving to DB 
                if(err){
                    console.log(err);
                    res.redirect('back');
                }else{
                    newComment.creator.username = req.user.name;
                    newComment.creator.userId = req.user._id;
                    newComment.save();
                    //console.log('NEW COMMENT ---------'+newComment);
                    foundBlog.comments.push(newComment);                    //associating comment to that blog
                    foundBlog.save();
                    //console.log('BLOG ---------'+foundBlog);
                    req.flash('success','Comment created Successfully!');
                    res.redirect('/blogs/'+req.params.id);                  //redirect to show page
                }
            });
        }
    });
});

// DESTROY - DELETE PARTICULAR COMMENT
app.delete('/blogs/:id/comments/:comment_id',checkCommentOwnership,function(req,res){
    Blog.findById(req.params.id,function(err,foundBlog){    //finding blog
        if(err || !foundBlog){
            req.flash('error','Blog Not Found!!');
            res.redirect('/blogs');
        }
        else{
            //console.log('FOUND BLOG before ------ '+foundBlog);    
            var index = foundBlog.comments.indexOf(req.params.comment_id);
            if(index==-1){
                req.flash('error','Your Comment is not associated to this Blog!!');
                return res.redirect('/blogs/'+req.params.id);
            }
            foundBlog.comments.splice(index,1);                  //removing comment-id from comments array
            foundBlog.save();
            //console.log('FOUND BLOG before ------ '+foundBlog);    
            Comment.findByIdAndRemove(req.params.comment_id,function(err){      //removing comment 
                if(err){
                    console.log(err);
                    res.redirect('back');
                }
                else{
                    //console.log('comment removed');
                    req.flash('success','Comment deleted Successfully!');
                    res.redirect('/blogs/'+req.params.id);            //redirect to show page
                }
            });
        }
    });
});

// ==========================================================
//                       LIKE ROUTES
// ==========================================================

app.get('/blogs/:id/like',isLoggedIn,function(req,res){
    Blog.findById(req.params.id,function(err,foundBlog){                 //finds that particular blog               
        if(err || !foundBlog){
            req.flash('error','Blog Not Found!!');
            res.redirect('/blogs');
        }else{
            User.findById(req.user._id,function(err,User){    
                if(err){
                    console.log(err);
                    res.redirect('back');
                }                              
                else{
                    console.log(foundBlog.likes.includes(User._id));
                    var isLiked = true;
                    if(foundBlog.likes.includes(User._id)){
                        isLiked = !isLiked;
                        var index = foundBlog.likes.indexOf(User._id);
                        console.log(foundBlog.likes);
                        foundBlog.likes.splice(index, 1);
                        foundBlog.save();
                        console.log(foundBlog.likes);
                    }
                    else{
                        console.log(foundBlog.likes);
                        foundBlog.likes.push(User._id);
                        foundBlog.save();
                        console.log(foundBlog.likes);
                    }
                    res.send({
                        likesCount : foundBlog.likes.length.toString(),
                        isLiked : isLiked
                    });
                }
            });
        }
    });
});

// ==========================================================
//                       AUTH ROUTES
// ==========================================================

// SIGNUP - SHOW FORM 
app.get('/register',function(req,res){
    res.render('auth/register.ejs');
});

// SIGNUP - WORKS ON FORM DATA
app.post("/register",function(req,res){
    User.register(new User({
        name:req.body.name,
        username:req.body.username,
    }), req.body.password,function(err,user){
        if(err){
            req.flash('error',err.message);
            res.redirect("/register");
        }
        else{
                passport.authenticate("local")(req,res,function(){
                req.flash('success','Welcome to BlogAdda - '+req.user.name);
                res.redirect("/blogs");
            });
        }
    });
});

// LOGIN - SHOW FORM 
app.get('/login',function(req,res){
    res.render('auth/login.ejs');
});

// LOGIN - WORKS ON FORM DATA
app.post("/login",passport.authenticate("local",{
    successRedirect: "/blogs",
    failureRedirect: "/login"
}),function(req,res){});

// LOGOUT
app.get("/logout",isLoggedIn,function(req,res){
    req.logOut();
    req.flash('success','You have loggedout successfully!')
    res.redirect("/blogs");
});

///////////////////// USER PROFILE ////////////////////

// SHOW - DISPLAY INFO ABOUT 1 USER
app.get('/users/:id',function(req,res){
    User.findById(req.params.id).populate('blogs').exec(function(err,foundUser){    //finds that particular user            
        if(err || !foundUser){
            req.flash('error','User Not Found!!');
            res.redirect('/blogs');
        }else{
            res.render('users/show.ejs',{user:foundUser});               //show page
        }
    });
});


// ==========================================================
//                       MIDDLEWARES
// ==========================================================


//a middleware - returns TRUE if session is active (user logged in)
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash('error','Please Login First!!!');
    res.redirect("/login");
}

// middleware - returns TRUE if loggedin user owns the blog
function checkBlogOwnership(req,res,next){
    if(req.isAuthenticated()){
        Blog.findById(req.params.id,function(err,blog){
            if(err || !blog){
                req.flash('error','Blog Not Found!');
                res.redirect('/blogs');
            }
            else{
                if(blog.creator.userId.equals(req.user._id)){
                    next();
                }
                else{
                    req.flash('error','You Have Not Permissions To Do That!!');
                    res.redirect("/blogs");
                }
            }
        });
    }
    else{
        req.flash('error','Please Login First!!!');
        res.redirect("/login");
    }
}

// middleware - returns TRUE if loggedin user owns the comment
function checkCommentOwnership(req,res,next){
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id,function(err,comment){
            if(err || !comment){
                req.flash('error','Comment Not Found!');
                res.redirect('/blogs/'+req.params.id);
            }
            else{
                if(comment.creator.userId.equals(req.user._id)){
                    next();
                }
                else{
                    req.flash('error','You Have Not Permissions To Do That!!');
                    res.redirect('/blogs/'+req.params.id);
                }
            }
        });
    }
    else{
        req.flash('error','Please Login First!!!');
        res.redirect("/login");
    }
}

/////////////////////////////////////////////////////////////

////////////////////////////////////////// server listening ///////////////////////////////////////////////

const PORT = process.env.PORT || 99;

app.listen(PORT,function(){
    console.log(`blog server starts at port ${PORT}`);
});

