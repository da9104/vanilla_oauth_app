const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const dotenv = require("dotenv")
const md5 = require("md5")
// const bcrypt = require("bcrypt")
// const saltRounds = 10
const session = require("express-session")
const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy;
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate")
const MongoStore = require('connect-mongo')
const flash = require('connect-flash')

dotenv.config()

app.use(express.static("public"))
app.use(express.json())
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(session({
    secret: process.env.SECRET,
    store: MongoStore.create({mongoUrl: process.env.CONNECTIONDB}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true} // session is valid for One day
}))

app.use(passport.session())
app.use(flash())

mongoose.connect(process.env.CONNECTIONDB, { useNewUrlParser: true, useUnifiedTopology: true })
// Schema for users of app
const UserSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId }, // const Schema = require('mongoose').Schema
    username: String,
    googleId: String,
    avatar: String,
    name: String,
    email: String,
    password: String,
    date: {
        type: Date,
        default: Date.now,
    },
});

UserSchema.plugin(passportLocalMongoose)
UserSchema.plugin(passportLocalMongoose, {
    usernameField : "email" });
UserSchema.plugin(findOrCreate)
const User = mongoose.model("users", UserSchema);
module.exports = {User, UserSchema}
User.createIndexes();

// const getAvatar = function() {
//     this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
// }

passport.use(User.createStrategy())
passport.use(new LocalStrategy({
    usernameField: "email",
},User.authenticate()));

app.use(passport.initialize());

passport.serializeUser((user, done) => {
    done(null, user);
 });

passport.deserializeUser(async (id, done) => {
   const USER = await User.findById(id).exec()
   done(null, USER);
//    User.findById(id)
//      .then((user) => {
//      done(null, user);
//    })
//    .catch((error) => {
//      console.log(`Error: ${error}`);
//    });
 });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACKURL,
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    async function(accessToken, refeshToken, profile, cb) {
        // console.log(profile)
        User.findOrCreate({ 
            googleId: profile.id, 
            username: profile.emails[0].value,
            email: profile._json.email, 
            name: profile.displayName,
            avatar: profile._json.picture
        }, function(err, user) {
            return cb(err, user)
        })
    }
))  

app.get("/", function(req, res) {
    res.render("home");
  });

app.get('/auth/google', passport.authenticate('google', { 
    scope: [ 'email', 'profile' ] 
}));

app.get("/auth/google/secret", passport.authenticate('google', {
    successRedirect: "/secret",
    failureRedirect: "/login"
}));

app.get("/secret", async function(req, res, next) {
    // console.log(req.user.username)
    if (req.isAuthenticated()) {
        await User.findOne({username: req.user.username}) // User.findOne({ "name" : {$ne: null}})
       .then((foundUser) => {
         console.log(foundUser)
         res.render("secret", { data: foundUser })})
       .catch((err) => console.log(err))
    } else {
        res.redirect("/login")
    }
  });

app.post("/logout", function(req, res, next) {
      req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect("/");
    });
});

app.get("/login", function(req, res) {
    res.render("login");
  });

app.get("/register", function(req, res) {
    res.render("register");
  });

app.post("/register", function(req, res) {
    User.register({ 
    _id: new mongoose.Types.ObjectId(),
    username: req.body.email, 
    name: req.body.name, 
    email: req.body.email,
    // avatar: getAvatar()
    }, 
    req.body.password, function(err, user) {
    if (err) {
        console.log(err)
        res.redirect("/register")
    } else {
        passport.authenticate("local")(req, res, function() {
        res.render("secret", {data: user})
      })
    }
  })
})

// app.post("/register", function(req, res) {
//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//         const newUser = new User({
//             name: req.body.name,
//             email: req.body.email,
//             password: hash
//         });
//         newUser.save().then((result) => {
//         console.log(result, "sucess")
//         // mongoose.connection.close()
//         return res.render("secret")
//         }).catch((err) => console.log(err))
//     })
// })

app.post("/login", function(req, res, next) {
   const user = new User({
     email: req.body.email,
     password: req.body.password 
    })
    req.login(user, function(err) {
    console.log(user)
    if (err) {
        console.log(err)
    } else {
        passport.authenticate("local")(req, res, function() {
        res.redirect('/secret')
     })
    }
    })
}) 

// app.post("/login", async function(req, res) {
//     const email = req.body.email
//     const password = req.body.password
//     await User.findOne({email: email}).then((foundUser) => {
//         if (foundUser) {
//             bcrypt.compare(password, foundUser.password, function(err, result) {
//                 if (result === true) {
//                     return res.render("secret")
//                 } else {
//                     console.log(err, "Authentication error.")
//                 }
//             })
//          }}).catch((err) => console.log(err))
// })

app.listen(process.env.PORT || 5001)
console.log("server started on port", process.env.PORT)
module.exports = app