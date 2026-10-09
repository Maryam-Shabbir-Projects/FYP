const express = require("express");

const router = express.Router();

const providerController = require(
  "../controllers/providerController"
);

// Send 4-digit verification code
router.post(
  "/send-code",
  providerController.sendVerificationCode
);

// Verify 4-digit code
router.post(
  "/verify-code",
  providerController.verifyVerificationCode
);

module.exports = router;