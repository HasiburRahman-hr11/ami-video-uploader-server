const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

function generatePassword(firstName, lastName, email, phone) {
  // Combine all variables into one string
  const combinedString = firstName + lastName + email + phone;

  // Arrays to store characters based on type
  const lowerCaseLetters = [];
  const upperCaseLetters = [];
  const numbers = [];

  // Populate arrays with characters from the combined string
  for (let char of combinedString) {
    if (char >= "a" && char <= "z") {
      lowerCaseLetters.push(char);
    } else if (char >= "A" && char <= "Z") {
      upperCaseLetters.push(char);
    } else if (char >= "0" && char <= "9") {
      numbers.push(char);
    }
  }

  // Ensure we have at least one of each required character type
  if (
    lowerCaseLetters.length === 0 ||
    upperCaseLetters.length === 0 ||
    numbers.length === 0
  ) {
    throw new Error(
      "Not enough character variety in input to generate a valid password"
    );
  }

  // Function to get a random element from an array
  function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Pick at least one character of each type
  let password = [
    getRandomElement(lowerCaseLetters),
    getRandomElement(upperCaseLetters),
    getRandomElement(numbers),
  ];

  // Fill the rest of the password length with random characters from the combined string
  while (password.length < 6) {
    password.push(getRandomElement(combinedString.split("")));
  }

  // Shuffle the password array to randomize character positions
  password = password.sort(() => Math.random() - 0.5);

  // Convert the password array to a string
  return password.join("");
}

exports.signUpWithEmail = async (req, res) => {
  // Check for validation errors

  const { firstName, lastName, email, phone } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(409)
        .json({ msg: "User already exists with this email." });
    }

    // Create new respondent
    user = new User({
      firstName,
      lastName,
      email,
      phone,
    });

    const password = generatePassword(firstName, lastName, email, phone);

    // Encrypt password
    user.password = await bcrypt.hash(password, 10);

    // Save respondent to database
    await user.save();

    // Create JWT token
    const userInfo = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      profilePicture: user.profilePicture,
    };

    const token = jwt.sign(userInfo, process.env.JWT_SECRET, {
      expiresIn: "48h",
    });

    // Send Password to the email
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.NODEMAILER_SENDER_EMAIL,
        pass: process.env.NODEMAILER_SENDER_PASS,
      },
    });

    const mailOptions = {
      from: process.env.NODEMAILER_SENDER_EMAIL,
      to: email,
      subject: "Login Password From AMI Video Uploader",
      text: `Your Login Password is: ${password}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ msg: "Failed to send password", token });
      } else {
        console.log("Email sent: " + info.response);
        res.status(200).json({ token }); // Return JWT token to the client
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.loginWithEmail = async (req, res) => {
  let { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: "User not found" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(200).json({ message: "Invalid password" });
    }
    const token = jwt.sign(
      {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture,
        bio: user?.bio || "",
      },
      process.env.JWT_SECRET
    );
    res.json({ token });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

exports.editUserProfile = async (req, res) => {
  try {
    console.log("Request received");
    console.log("File received:", req.file);
    const { firstName, lastName, bio, phone } = req.body;
    const userId = req.params.userId;

    let userInfo = {
      firstName,
      lastName,
      bio,
      phone,
    };

    if (req.file) {
      const profilePicture = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
      userInfo.profilePicture = profilePicture;
    }
    const user = await User.findOneAndUpdate({ _id: userId }, userInfo, {
      new: true,
    });

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.status(200).json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.json(user); // Send the entire user object as JSON
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("An error occurred while fetching user details");
  }
};
