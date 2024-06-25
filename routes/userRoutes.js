const {
  signUpWithEmail,
  loginWithEmail,
  editUserProfile,
  getUserById,
} = require("../controllers/userController");
const multer = require("multer");
const router = require("express").Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 10MB file size limit
});

router.post("/user/register/by-email", signUpWithEmail);
router.post("/user/login/by-email", loginWithEmail);
router.post(
  "/user/update/:userId",
  upload.single("profilePicture"),
  editUserProfile
);
router.get('/user/:userId', getUserById);

module.exports = router;
