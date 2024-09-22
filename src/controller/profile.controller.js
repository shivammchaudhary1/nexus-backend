const User = require("../models/user.model.js");
const { sendEmail } = require("../config/lib/nodemailer.js");
const { config } = require("../config/env/default.js");
const { isValidPassword } = require("../config/utility/validation.js");
const { signJwt, jwtVerify } = require("../config/lib/jwt.js");
const {
  encryptPassword,
  comparePassword,
} = require("../config/lib/bcryptjs.js");

const getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json("User not found");
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json(`Failed to get user profile: ${error.message}`);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { _id: id },
      {
        name,
      },
      { new: true }
    );
    res
      .status(201)
      .json({ message: "User profile successfully updated", updatedUser });
  } catch (error) {
    return res
      .status(500)
      .json(`Failed to update user profile :${error.message}`);
  }
};

const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, password } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json("User not found.");
    }

    if (password.length <= 6) {
      return res.status(400).json("Password length should be greater than 6.");
    } else if (!isValidPassword(password)) {
      return res
        .status(400)
        .json(
          "Password must include at least one number, both lower and uppercase letters and at least one special character, such as '@,#,$,?'"
        );
    }

    // Compare old password
    const isOldPasswordValid = await comparePassword(
      oldPassword,
      user.password
    );

    if (!isOldPasswordValid) {
      return res.status(400).json("Current password is incorrect.");
    }

    // Encrypt the new password
    const newPassword = await encryptPassword(password);

    // Update the user's password
    user.password = newPassword;
    await user.save();

    return res.status(200).json("Password reset successfully");
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json("Password Reset Failed: An internal server error occurred.");
  }
};

const sendForgetLinkToMail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const token = signJwt({ email: user.email, id: user._id }, "20m", "access");
    const link = `${config.frontend_domain}/profile/forgetpassword/${user._id}/${token}`;

    const html = `  <div style="height: auto; width: 80%; margin: auto">
 <div style="text-align: center; background-color: #19acb4; padding: 2%">
   <img
     style="width: 8%"
     src="https://trackify.ai/static/media/logo.cb10d908.png"
     alt="no image"
   />
   <h3 style="color: aliceblue">Please Reset Your Password</h3>
 </div>

 <div
   style="
     height: 50%;
     padding: 2%;
     background-color: #c4eaec;
     font-size: 1.2em;
   "
 >
   <p>
     Hello,<br /><br />
     Forgot your password ? <br />
     We have sent you this email in response to your request to reset your
     password on Nexus account. <br />
     <br />To reset your password, please follow the link below:
   </p>
   <div style="margin-top: 5%; margin-bottom: 7%">
     <a
       href="${link}"
       style="
         text-decoration: none;
         background-color: #19acb4;
         color: aliceblue;
         padding: 1% 3%;
         border-radius: 20px;
         box-shadow: 0 2px #999;
         width: 25%;
       "
       >Reset Password</a
     >
   </div>
   <i style="color: gray; font-size: 0.8em"
     >Please ignore this email if you did not request a password change.</i
   >
 </div>

 <div style="height: 17%; text-align: center; background-color: #19acb4">
   <div style="padding: 2%">
     <p style="color: aliceblue">
       For more information, contact <br />
       <a href="mailto:trackify@gmail.com" style="color: aliceblue"
         >trackify@gmail.com</a
       >
     </p>
   </div>
 </div>
</div>`;

    await sendEmail(email, "Reset Password", html);

    res.status(201).json({ message: "Reset link sent to your e-mail" });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to send reset password link.: ${error.message}`,
    });
  }
};

const verifyEmailLinkAndUpdate = async (req, res) => {
  try {
    const { id, token } = req.params;
    const { password, confirmPassword } = req.body;

    const user = await User.findById(id);

    if (!password || !confirmPassword) {
      return res
        .status(400)
        .json("Password and confirm password fields cannot be empty.");
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (password.length <= 6 || !isValidPassword(password)) {
      return res.status(400).json({
        error: "Invalid password",
        message:
          "Password must be at least 7 characters long and contain at least one number, both lower and uppercase letters, and at least one special character (e.g., @, #, $, ?).",
      });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Password and confirm password should match." });
    }

    const isVerified = jwtVerify(token, "access");

    if (!isVerified) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // Encrypt the new password
    const newPassword = await encryptPassword(password);

    // Update the user's password
    user.password = newPassword;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Failed to reset password: ${error.message}` });
  }
};

async function changeTheme(req, res){
  const user =  req.user;
  try {
    const { themeId } = req.body;
    
    if(!themeId){
      return res.status(400).json("Theme id is required");
    }
    const updatedUser =  await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          "workspaceThemes.$[elem].theme": themeId,
        },
      },
      {
        arrayFilters: [{ "elem.workspaceId": user.currentWorkspace }],
        new: true,
      }
    );
    return res.status(200).json({user:updatedUser});
  } catch (error) {
    res.status(500).json(error.message);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  sendForgetLinkToMail,
  verifyEmailLinkAndUpdate,
  changeTheme,
};
