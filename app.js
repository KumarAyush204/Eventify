const express = require('express');
const path = require('path');
const multer = require("multer");
const authRouter = require("./routes/authRouter");
const useRouter = require("./routes/user");
const { hostRouter } = require("./routes/host");
const errorRouter = require('./routes/404');
const rootDir = require("./utils/pathUtil");
const { default: mongoose } = require('mongoose');
const session = require('express-session');
const MongoDbStore = require('connect-mongodb-session')(session);

const DB_PATH = "mongodb://localhost:27017/StayEasy3";
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(rootDir, 'views'));

const store = new MongoDbStore({
  uri: DB_PATH,
  collection: 'sessions'
});

const randomString = (length) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'photoUrl') {
      cb(null, "uploads/"); // Images folder
    } else if (file.fieldname === 'houseRulesPdf') {
      cb(null, "uploads/rules"); // PDFs folder
    }
  },
  filename: (req, file, cb) => {
    cb(null, randomString(10) + '-' + file.originalname);
  }
});

// Multer file filter
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'application/pdf'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};


const multerOptions = {
  storage,
  fileFilter
};

app.use(express.static(path.join(rootDir, 'public')));
app.use(express.urlencoded());
app.use(multer(multerOptions).fields([
  { name: 'photoUrl', maxCount: 10 },        // Images
  { name: 'houseRulesPdf', maxCount: 1 }     // PDF
]));

app.use("/uploads", express.static(path.join(rootDir, 'uploads')));
app.use("/host/uploads", express.static(path.join(rootDir, 'uploads')));
app.use("/home-detail/uploads", express.static(path.join(rootDir, 'uploads')));

// Serve PDFs as static files
// Serve the 'uploads' folder (including rules)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(session({
  secret: 'MERN',
  resave: false,
  saveUninitialized: true,
}));

app.use((req, res, next) => {
  req.isLoggedIn = req.session.isLoggedIn;
  next();
});

app.use("/host", (req, res, next) => {
  if (req.isLoggedIn) {
    next();
  } else {
    res.redirect("/login")
}});

app.use(authRouter);
app.use(useRouter);
app.use(hostRouter);
app.use(errorRouter);

const port = 3003;

mongoose.connect(DB_PATH).then(() => {
  console.log('Connected to MongoDB');
  app.listen(port, () => {
    console.log(`http://localhost:${port}`);
  });
}).catch(err => {
  console.log("Error while connecting to MongoDB", err);
});
