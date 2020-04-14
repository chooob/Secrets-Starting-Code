//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt =require("mongoose-encryption");
const md5 = require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const flash = require("connect-flash-plus");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook").Strategy;

const app = express();
app.set('view engine','ejs');
app.use(express.urlencoded());
app.use(express.static("public"));
mongoose.set("useNewUrlParser", true);
mongoose.set("useUnifiedTopology", true );
mongoose.set("useCreateIndex",true);

app.use(session({
  secret:"Our Secret",
  resave: false,
  saveUninitialized: false
}));

  // app.use(express.cookieParser('keyboard cat'));
  // app.use(express.session({ cookie: { maxAge: 60000 }}));


app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb://localhost:27017/userDB");

app.use(flash());


const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
  facebookId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//plugin to encrypt certian fields
//npm i mongoose-encryption
//process.env.SECRET is what the SECRET is referring to in the .env file
///////////////////////////////////////////////////////////////only encrypting the password field can add more fields by adding to [" "]
// userSchema.plugin(encrypt,{ secret: process.env.SECRET, encryptedFields:["password"] });



const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile.id);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
  res.render("home");
});

//google auth
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    });

//facebook auth
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register",{
    holder:"Enter Email"
  });
});

app.get("/secrets",function(req,res){

  User.find({"secret":{$ne:null}},function(err,foundUsers){
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render("secrets",{usersWithSecrets:foundUsers})
      }
    }
  })
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

app.post("/register",function(req,res){
  //
  // bcrypt.hash(req.body.password,saltRounds,function(err,hash){
  //   const newUser = new User({
  //     email: req.body.username,
  //     password: hash
  //   })
  //   newUser.save(function(err){
  //     if(!err){
  //       res.render("secrets");
  //     }else{
  //       console.log(err);
  //     }
  //   })
  // })
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  })

});

app.get('/flash', function(req, res){
  // Set a flash message by passing the key, followed by the value, to req.flash().
  req.flash('info', 'Flash is back!')
  console.log(req.flash('info'));
  res.redirect('/');
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.post("/submit",function(req,res){

  const submittedSecret = req.body.secret;
  //passport gives us a function to return the logged in user with req.user
  User.findById(req.user.id,function(err,user){
    if(!err){
      if(user){
        user.secret = submittedSecret;
        user.save();
        res.redirect("/secrets");
      }
    }else{
      console.log(err);
    }
  });

})

app.post("/login",passport.authenticate('local', { successRedirect: "/secrets",
                             failureRedirect: "/login" }));



    // const username = req.body.username;
    // const password = req.body.password;
    //
    // User.findOne({email:username},function(err,foundUser){
    //   if(err){
    //     console.log(err);
    //   }else{
    //     if(foundUser){
    //       bcrypt.compare(password,foundUser.password,function(err,result){
    //         if(result === true){
    //           res.render("secrets");
    //           console.log("Found");
    //         }
    //       })
    //     }else{
    //       res.render("register",{
    //         holder:username
    //       });
    //       console.log("Found2");
    //     }
    //   }
    // })
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    // const user = new User({
    //   username:req.body.username,
    //   password:req.body.password
    // });
    //
    // req.login(user,function(err){
    //   if(err){
    //     console.log(err);
    //
    //   }else{
    //
    //
    //   //  passport.authenticate("local",{successRedirect:"/secrets",failureRedirect:"/login"});
    //
    //
    //
    //   }
    // });
    //
    //


// });

app.listen(3000,function(req,res){
  console.log("Local Hosted");
});
