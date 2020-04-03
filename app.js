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

const app = express();
app.set('view engine','ejs');

mongoose.set("useNewUrlParser", true);
mongoose.set("useUnifiedTopology", true );
mongoose.connect("mongodb://localhost:27017/userDB");

app.use(express.urlencoded());
app.use(express.static("public"));

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

//plugin to encrypt certian fields
//npm i mongoose-encryption
//process.env.SECRET is what the SECRET is referring to in the .env file
///////////////////////////////////////////////////////////////only encrypting the password field can add more fields by adding to [" "]
// userSchema.plugin(encrypt,{ secret: process.env.SECRET, encryptedFields:["password"] });



const User = new mongoose.model("User",userSchema);


app.get("/",function(req,res){
  res.render("home");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register",{
    holder:"Enter Email"
  });
});

app.post("/register",function(req,res){

  bcrypt.hash(req.body.password,saltRounds,function(err,hash){
    const newUser = new User({
      email: req.body.username,
      password: hash
    })
    newUser.save(function(err){
      if(!err){
        res.render("secrets");
      }else{
        console.log(err);
      }
    })
  })


});

app.post("/login",function(req,res){



    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email:username},function(err,foundUser){
      if(err){
        console.log(err);
      }else{
        if(foundUser){
          bcrypt.compare(password,foundUser.password,function(err,result){
            if(result === true){
              res.render("secrets");
              console.log("Found");
            }
          })
        }else{
          res.render("register",{
            holder:username
          });
          console.log("Found2");
        }
      }
    })




});

app.listen(3000,function(req,res){
  console.log("Local Hosted");
});
