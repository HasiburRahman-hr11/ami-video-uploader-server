const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes');
const videoRoutes = require('./routes/videoRoutes');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(cors());


// Routes
app.use(userRoutes);
app.use(videoRoutes);

app.get("/", async (req, res) => {
  res.send({
    msg: "Server Running good",
  });
});

const PORT = process.env.PORT || 8000;
mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}.3osg4ep.mongodb.net/ami-db`
  )
  .then(() => {
    console.log("Database Connected.");
    app.listen(PORT, () => {
      console.log(`Server is connected at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
  });
