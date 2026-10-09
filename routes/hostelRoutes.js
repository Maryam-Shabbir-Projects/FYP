const express = require("express");

const router = express.Router();

const hostelController =
  require("../controllers/hostelController");


// ======================================================
// ADD HOSTEL
// POST /hostels/
// ======================================================
router.post(
  "/",
  hostelController.addHostel
);


// ======================================================
// GET APPROVED HOSTELS
// GET /hostels/
// ======================================================
router.get(
  "/",
  hostelController.getHostels
);


// ======================================================
// GET MY HOSTELS
// GET /hostels/my/list?email=provider@gmail.com
// ======================================================
router.get(
  "/my/list",
  hostelController.getMyHostels
);


// ======================================================
// GET PENDING HOSTELS
// GET /hostels/pending/list
// ======================================================
router.get(
  "/pending/list",
  hostelController.getPendingHostels
);


// ======================================================
// APPROVE HOSTEL
// PATCH /hostels/approve/:id
// ======================================================
router.patch(
  "/approve/:id",
  hostelController.approveHostel
);


// ======================================================
// APPROVE EDIT REQUEST
// PATCH /hostels/approve-edit/:id
// ======================================================
router.patch(
  "/approve-edit/:id",
  hostelController.approveHostelEdit
);


// ======================================================
// GET SINGLE HOSTEL
// GET /hostels/:id
// ======================================================
router.get(
  "/:id",
  hostelController.getHostelById
);


// ======================================================
// UPDATE HOSTEL
// PUT /hostels/:id
// ======================================================
router.put(
  "/:id",
  hostelController.updateHostel
);


// ======================================================
// DELETE HOSTEL
// DELETE /hostels/:id
// ======================================================
router.delete(
  "/:id",
  hostelController.deleteHostel
);


module.exports = router;