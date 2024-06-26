const express = require("express");
const multer = require("multer");
const { uploadNewVideo, updateVideo, deleteVideo, getHomeVideos, getSingleUserVideos } = require("../controllers/videoController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Make sure the uploads directory exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post("/video/upload/:userId", upload.single("video"), uploadNewVideo);
router.put("/video/update/:videoId", upload.single("video"), updateVideo);
router.delete("/video/delete/:videoId/:userId", deleteVideo);
router.get("/video/home-videos", getHomeVideos);
router.get("/video/user-videos/:userId", getSingleUserVideos);

module.exports = router;
