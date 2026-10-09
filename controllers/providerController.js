const nodemailer = require("nodemailer");

// Temporary storage for verification codes
// email -> { code, expiresAt }
const verificationCodes = new Map();

// ======================================================
// EMAIL CONFIGURATION
// ======================================================

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ======================================================
// SEND VERIFICATION CODE
// ======================================================

exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    // -------------------------------
    // Validate email
    // -------------------------------

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // -------------------------------
    // Generate random 4-digit code
    // -------------------------------

    const code = Math.floor(
      1000 + Math.random() * 9000
    ).toString();

    // Code expires after 5 minutes
    const expiresAt =
      Date.now() + 5 * 60 * 1000;

    // Store code
    verificationCodes.set(
      email.toLowerCase(),
      {
        code,
        expiresAt,
      }
    );

    // -------------------------------
    // Send email
    // -------------------------------

    await transporter.sendMail({
      from: `"Hostel Finder" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Hostel Finder - Email Verification Code",

      text:
        `Your Hostel Finder verification code is: ${code}\n\n` +
        `This code will expire in 5 minutes.\n\n` +
        `If you did not request this code, please ignore this email.`,

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: auto;
          padding: 25px;
          border: 1px solid #ddd;
          border-radius: 12px;
        ">

          <h2 style="color:#111827;">
            Hostel Finder
          </h2>

          <p>
            Your provider account verification code is:
          </p>

          <div style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            text-align: center;
            padding: 15px;
            background: #f3f4f6;
            border-radius: 10px;
            margin: 20px 0;
          ">
            ${code}
          </div>

          <p>
            This code will expire in
            <strong>5 minutes</strong>.
          </p>

          <p style="color:#666;">
            If you did not request this code,
            you can safely ignore this email.
          </p>

        </div>
      `,
    });

    console.log(
      `Verification code sent to ${email}`
    );

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
    });

  } catch (error) {

    console.error(
      "Send verification code error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Could not send verification code",
    });
  }
};

// ======================================================
// VERIFY CODE
// ======================================================

exports.verifyVerificationCode = async (
  req,
  res
) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required",
      });
    }

    const savedData =
      verificationCodes.get(
        email.toLowerCase()
      );

    // No code found
    if (!savedData) {
      return res.status(400).json({
        success: false,
        message:
          "No verification code found. Please request a new code.",
      });
    }

    // Check expiration
    if (Date.now() > savedData.expiresAt) {

      verificationCodes.delete(
        email.toLowerCase()
      );

      return res.status(400).json({
        success: false,
        message:
          "Verification code has expired. Please request a new code.",
      });
    }

    // Check code
    if (savedData.code !== code.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // Code is correct
    verificationCodes.delete(
      email.toLowerCase()
    );

    return res.status(200).json({
      success: true,
      verified: true,
      message: "Email verified successfully",
    });

  } catch (error) {

    console.error(
      "Verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};