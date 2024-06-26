const User = require("../models/User");
const Video = require("../models/Video");
const { v2: cloudinary } = require("cloudinary");
const mongoose = require("mongoose");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadNewVideo = async (req, res) => {
  const userId = req.params.userId;
  const { title, description } = req.body;
  if (!title || !userId) {
    return res.status(400).json({ error: "Title and userId are required" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No video file uploaded" });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(409).json({ message: "User not found" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
      folder: "videos",
    });

    const video = new Video({
      title,
      description,
      userId,
      url: result.secure_url,
      cloudinaryId: result.public_id,
    });

    await video.save();

    // Update the user's videos array
    await User.findByIdAndUpdate(userId, { $push: { videos: video._id } });

    await video.save();
    res.status(201).json(video);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to upload video" });
  }
};

exports.deleteVideo = async (req, res) => {
  const { videoId, userId } = req.params;

  try {
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(409).json({ message: "User not found" });
    }

    // Delete video from Cloudinary
    await cloudinary.uploader.destroy(video.cloudinaryId, {
      resource_type: "video",
    });

    // Remove video from user's videos array
    await User.findByIdAndUpdate(userId, { $pull: { videos: videoId } });

    // Delete video from database
    await Video.findByIdAndDelete(videoId);

    res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete video" });
  }
};

exports.updateVideo = async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  try {
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    if (req.file) {
      // Delete the old video from Cloudinary
      await cloudinary.uploader.destroy(video.cloudinaryId, {
        resource_type: "video",
      });

      // Upload the new video to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "videos",
      });

      video.url = result.secure_url;
      video.cloudinaryId = result.public_id;
    }

    if (title) video.title = title;
    if (description) video.description = description;

    await video.save();

    res.status(200).json(video);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update video" });
  }
};

exports.getHomeVideos = async (req, res) => {
  try {
    const users = await User.find({}).populate({
      path: "videos",
      options: { limit: 3, sort: { createdAt: -1 } },
    });

    const userVideos = users
      .filter((user) => user.videos.length > 0)
      .map((user) => ({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        videos: user.videos,
      }));

    res.json(userVideos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
};

exports.getSingleUserVideos = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 3 } = req.query;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  try {
    const user = await User.findById(userId).populate({
      path: "videos",
      options: {
        sort: { createdAt: -1 },
        skip: (page - 1) * limit,
        limit: parseInt(limit, 10),
      },
    });
    const totalVideos = await User.findById(userId).populate({
        path: "videos"
      });

    let totalPage = (totalVideos.videos.length) / (parseInt(limit, 10));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ videos: user.videos, totalPage: totalPage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
};
