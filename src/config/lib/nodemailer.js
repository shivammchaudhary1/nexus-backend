const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
  try {
    // const transporter = nodemailer.createTransport({
    //   host: "trackify.ai",
    //   port: 465,
    //   auth: {
    //     user: "support@trackify.ai",
    //     pass: "support@trackify.ai",
    //   },
    // });

    const transporter = nodemailer.createTransport({
      host: "trackify.ai",
      port: 465,
      secure: true,
      auth: {
        user: "support@trackify.ai",
        pass: "support@trackify.ai",
      },
      tls: {
        rejectUnauthorized: false, // Allow expired certificates (not recommended for production)
      },
    });

    const mailOptions = {
      from: "support@trackify.ai",
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};

module.exports = { sendEmail };
