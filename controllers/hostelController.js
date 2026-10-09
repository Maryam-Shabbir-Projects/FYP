const db = require("../config/firebase");

const hostelsRef = db.collection("hostels");
const MAX_IMAGES = 3;

// ======================================================
// HELPER: STANDARD ERROR RESPONSE
// ======================================================
function sendServerError(res, operation, err) {
  console.error(`${operation} error:`, err);

  return res.status(500).json({
    success: false,
    message: `${operation} failed`,
    error: err?.message || "Unexpected server error",
  });
}

// ======================================================
// HELPER: CHECK EMPTY FIELDS
// ======================================================
function isBlank(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  );
}

// ======================================================
// HELPER: VALIDATE PAKISTANI MOBILE NUMBER
// Accepted examples:
// 03001234567
// +923001234567
// 923001234567
// 00923001234567
// ======================================================
function validatePakistaniMobile(value) {
  if (typeof value !== "string" || !value.trim()) {
    return {
      valid: false,
      message: "WhatsApp/mobile number is required.",
    };
  }

  let digits = value.trim().replace(/[\s()-]/g, "");

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("0092")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("92")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Pakistani mobile numbers have 10 digits after country code 92.
  if (!/^3\d{9}$/.test(digits)) {
    return {
      valid: false,
      message:
        "Enter a valid Pakistani mobile number, e.g. 03001234567 or +923001234567.",
    };
  }

  return {
    valid: true,
    value: `+92${digits}`,
  };
}

// ======================================================
// HELPER: VALIDATE EMAIL
// ======================================================
function validateEmail(value) {
  if (typeof value !== "string" || !value.trim()) {
    return {
      valid: false,
      message: "Email is required.",
    };
  }

  const email = value.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return {
      valid: false,
      message: "Enter a valid email address.",
    };
  }

  return {
    valid: true,
    value: email,
  };
}

// ======================================================
// HELPER: VALIDATE POSITIVE RENT
// ======================================================
function parseRent(value) {
  if (isBlank(value)) {
    return {
      valid: false,
      message: "Monthly rent is required.",
    };
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return {
      valid: false,
      message: "Rent must be a valid number greater than zero.",
    };
  }

  return {
    valid: true,
    value: number,
  };
}

// ======================================================
// HELPER: VALIDATE COORDINATES
// ======================================================
function parseCoordinate(value, field) {
  if (isBlank(value)) {
    return {
      valid: false,
      message: `${field} is required.`,
    };
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return {
      valid: false,
      message: `${field} must be a valid number.`,
    };
  }

  if (
    (field === "latitude" && (number < -90 || number > 90)) ||
    (field === "longitude" && (number < -180 || number > 180))
  ) {
    return {
      valid: false,
      message: `${field} is outside the valid range.`,
    };
  }

  return {
    valid: true,
    value: number,
  };
}

// ======================================================
// HELPER: VALIDATE HOSTEL IMAGES
// Accept HTTPS Cloudinary URLs only.
// Maximum 3 images.
// ======================================================
function validateImages(images) {
  if (!Array.isArray(images)) {
    return {
      valid: false,
      message: "Hostel images must be provided as an array.",
    };
  }

  if (images.length === 0) {
    return {
      valid: false,
      message: "Please upload at least one hostel image.",
    };
  }

  if (images.length > MAX_IMAGES) {
    return {
      valid: false,
      message: `A maximum of ${MAX_IMAGES} images is allowed.`,
    };
  }

  const cleanImages = [];

  for (const image of images) {
    if (typeof image !== "string" || !image.trim()) {
      return {
        valid: false,
        message: "Every image must have a valid URL.",
      };
    }

    try {
      const parsedUrl = new URL(image.trim());

      if (
        parsedUrl.protocol !== "https:" ||
        parsedUrl.hostname.toLowerCase() !== "res.cloudinary.com"
      ) {
        return {
          valid: false,
          message: "Images must use HTTPS Cloudinary URLs.",
        };
      }

      cleanImages.push(parsedUrl.href);
    } catch {
      return {
        valid: false,
        message: "An image URL is invalid.",
      };
    }
  }

  return {
    valid: true,
    images: cleanImages,
  };
}

// ======================================================
// HELPER: VALIDATE FACILITIES
// Requires a non-empty object with valid values.
// ======================================================
function validateFacilities(facilities) {
  if (
    !facilities ||
    typeof facilities !== "object" ||
    Array.isArray(facilities) ||
    Object.keys(facilities).length === 0
  ) {
    return {
      valid: false,
      message: "Please select or provide at least one facility.",
    };
  }

  for (const [key, value] of Object.entries(facilities)) {
    if (
      !key.trim() ||
      value === undefined ||
      value === null ||
      (typeof value === "string" && !value.trim())
    ) {
      return {
        valid: false,
        message: "Please complete every facilities field.",
      };
    }
  }

  return {
    valid: true,
    value: facilities,
  };
}

// ======================================================
// HELPER: VALIDATE ALL REQUIRED FIELDS FOR ADD HOSTEL
// ======================================================
function validateNewHostel(data) {
  const requiredFields = [
    "name",
    "rent",
    "category",
    "facilities",
    "latitude",
    "longitude",
    "whatsapp",
    "email",
    "images",
  ];

  const missingFields = requiredFields.filter((field) => {
    if (!Object.hasOwn(data, field) || isBlank(data[field])) {
      return true;
    }

    if (field === "images") {
      return !Array.isArray(data.images) || data.images.length === 0;
    }

    return false;
  });

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: "Please fill in all required fields.",
      missingFields,
    };
  }

  if (typeof data.name !== "string" || !data.name.trim()) {
    return {
      valid: false,
      message: "Hostel name is required.",
    };
  }

  if (typeof data.category !== "string" || !data.category.trim()) {
    return {
      valid: false,
      message: "Please select a hostel category.",
    };
  }

  const rentResult = parseRent(data.rent);

  if (!rentResult.valid) {
    return rentResult;
  }

  const latitudeResult = parseCoordinate(data.latitude, "Latitude");

  if (!latitudeResult.valid) {
    return latitudeResult;
  }

  const longitudeResult = parseCoordinate(data.longitude, "Longitude");

  if (!longitudeResult.valid) {
    return longitudeResult;
  }

  const facilitiesResult = validateFacilities(data.facilities);

  if (!facilitiesResult.valid) {
    return facilitiesResult;
  }

  const phoneResult = validatePakistaniMobile(data.whatsapp);

  if (!phoneResult.valid) {
    return phoneResult;
  }

  const emailResult = validateEmail(data.email);

  if (!emailResult.valid) {
    return emailResult;
  }

  const imageResult = validateImages(data.images);

  if (!imageResult.valid) {
    return imageResult;
  }

  return {
    valid: true,
    data: {
      name: data.name.trim(),
      rent: rentResult.value,
      category: data.category.trim(),
      facilities: facilitiesResult.value,
      latitude: latitudeResult.value,
      longitude: longitudeResult.value,
      whatsapp: phoneResult.value,
      email: emailResult.value,
      images: imageResult.images,
    },
  };
}

// ======================================================
// HELPER: VALIDATE HOSTEL EDIT REQUEST
// ======================================================
function validateHostelChanges(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return {
      valid: false,
      message: "Invalid hostel update data.",
    };
  }

  const allowedFields = [
    "name",
    "rent",
    "category",
    "facilities",
    "latitude",
    "longitude",
    "whatsapp",
    "email",
    "images",
  ];

  const cleanUpdate = {};

  for (const field of allowedFields) {
    if (Object.hasOwn(input, field)) {
      cleanUpdate[field] = input[field];
    }
  }

  if (Object.keys(cleanUpdate).length === 0) {
    return {
      valid: false,
      message: "No editable fields provided.",
    };
  }

  if (Object.hasOwn(cleanUpdate, "name")) {
    if (
      typeof cleanUpdate.name !== "string" ||
      !cleanUpdate.name.trim()
    ) {
      return {
        valid: false,
        message: "Hostel name is required.",
      };
    }

    cleanUpdate.name = cleanUpdate.name.trim();
  }

  if (Object.hasOwn(cleanUpdate, "category")) {
    if (
      typeof cleanUpdate.category !== "string" ||
      !cleanUpdate.category.trim()
    ) {
      return {
        valid: false,
        message: "Category is required.",
      };
    }

    cleanUpdate.category = cleanUpdate.category.trim();
  }

  if (Object.hasOwn(cleanUpdate, "rent")) {
    const result = parseRent(cleanUpdate.rent);

    if (!result.valid) return result;

    cleanUpdate.rent = result.value;
  }

  for (const field of ["latitude", "longitude"]) {
    if (Object.hasOwn(cleanUpdate, field)) {
      const result = parseCoordinate(cleanUpdate[field], field);

      if (!result.valid) return result;

      cleanUpdate[field] = result.value;
    }
  }

  if (Object.hasOwn(cleanUpdate, "whatsapp")) {
    const result = validatePakistaniMobile(cleanUpdate.whatsapp);

    if (!result.valid) return result;

    cleanUpdate.whatsapp = result.value;
  }

  if (Object.hasOwn(cleanUpdate, "email")) {
    const result = validateEmail(cleanUpdate.email);

    if (!result.valid) return result;

    cleanUpdate.email = result.value;
  }

  if (Object.hasOwn(cleanUpdate, "facilities")) {
    const result = validateFacilities(cleanUpdate.facilities);

    if (!result.valid) return result;

    cleanUpdate.facilities = result.value;
  }

  if (Object.hasOwn(cleanUpdate, "images")) {
    const result = validateImages(cleanUpdate.images);

    if (!result.valid) return result;

    cleanUpdate.images = result.images;
  }

  return {
    valid: true,
    data: cleanUpdate,
  };
}

// ======================================================
// ADD HOSTEL
// POST /hostels
// ======================================================
exports.addHostel = async (req, res) => {
  try {
    const data = req.body || {};

    const validation = validateNewHostel(data);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        ...(validation.missingFields
          ? { missingFields: validation.missingFields }
          : {}),
      });
    }

    const newHostel = {
      ...validation.data,
      status: "pending",
      pendingUpdate: null,
      createdAt: new Date(),
    };

    const result = await hostelsRef.add(newHostel);

    return res.status(201).json({
      success: true,
      id: result.id,
      message: "Hostel added successfully. Awaiting admin approval.",
      images: newHostel.images,
    });
  } catch (err) {
    return sendServerError(res, "Add hostel", err);
  }
};

// ======================================================
// GET APPROVED HOSTELS
// GET /hostels
// ======================================================
exports.getHostels = async (req, res) => {
  try {
    const snapshot = await hostelsRef
      .where("status", "==", "approved")
      .get();

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(data);
  } catch (err) {
    return sendServerError(res, "Get hostels", err);
  }
};

// ======================================================
// GET MY HOSTELS
// GET /hostels/my/list?email=provider@gmail.com
// ======================================================
exports.getMyHostels = async (req, res) => {
  try {
    const email =
      typeof req.query.email === "string"
        ? req.query.email.trim()
        : "";

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const snapshot = await hostelsRef
      .where("email", "==", email)
      .get();

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(data);
  } catch (err) {
    return sendServerError(res, "Get my hostels", err);
  }
};

// ======================================================
// GET PENDING HOSTELS
// GET /hostels/pending/list
// ======================================================
exports.getPendingHostels = async (req, res) => {
  try {
    const snapshot = await hostelsRef
      .where("status", "==", "pending")
      .get();

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(data);
  } catch (err) {
    return sendServerError(res, "Get pending hostels", err);
  }
};

// ======================================================
// GET SINGLE HOSTEL
// GET /hostels/:id
// ======================================================
exports.getHostelById = async (req, res) => {
  try {
    const id = req.params.id;

    const doc = await hostelsRef.doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found.",
      });
    }

    return res.status(200).json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (err) {
    return sendServerError(res, "Get hostel", err);
  }
};

// ======================================================
// DELETE HOSTEL
// DELETE /hostels/:id
// ======================================================
exports.deleteHostel = async (req, res) => {
  try {
    const id = req.params.id;
    const docRef = hostelsRef.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found.",
      });
    }

    await docRef.delete();

    return res.status(200).json({
      success: true,
      message: "Hostel deleted successfully.",
    });
  } catch (err) {
    return sendServerError(res, "Delete hostel", err);
  }
};

// ======================================================
// APPROVE NEW HOSTEL
// PATCH /hostels/approve/:id
// ======================================================
exports.approveHostel = async (req, res) => {
  try {
    const docRef = hostelsRef.doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found.",
      });
    }

    if (doc.data().status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This hostel is not awaiting initial approval.",
      });
    }

    await docRef.update({
      status: "approved",
    });

    return res.status(200).json({
      success: true,
      message: "Hostel approved successfully.",
    });
  } catch (err) {
    return sendServerError(res, "Approve hostel", err);
  }
};

// ======================================================
// SUBMIT HOSTEL EDIT REQUEST
// PUT /hostels/:id
// Body: { "pendingUpdate": { ... } }
// ======================================================
exports.updateHostel = async (req, res) => {
  try {
    const docRef = hostelsRef.doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found.",
      });
    }

    const currentData = doc.data();

    if (
      currentData.status === "pending" ||
      currentData.status === "update_pending"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This hostel already has a pending approval request.",
      });
    }

    const validation = validateHostelChanges(
      req.body?.pendingUpdate
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    await docRef.update({
      pendingUpdate: validation.data,
      status: "update_pending",
    });

    return res.status(200).json({
      success: true,
      message: "Update request sent for admin approval.",
      pendingUpdate: validation.data,
    });
  } catch (err) {
    return sendServerError(res, "Update hostel", err);
  }
};

// ======================================================
// APPROVE HOSTEL EDIT
// PATCH /hostels/approve-edit/:id
// ======================================================
exports.approveHostelEdit = async (req, res) => {
  try {
    const docRef = hostelsRef.doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found.",
      });
    }

    const data = doc.data();
    const pendingUpdate = data.pendingUpdate;

    if (
      data.status !== "update_pending" ||
      !pendingUpdate ||
      typeof pendingUpdate !== "object"
    ) {
      return res.status(400).json({
        success: false,
        message: "No pending edit request exists.",
      });
    }

    // Revalidate the stored update before applying it.
    const validation = validateHostelChanges(pendingUpdate);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    await docRef.update({
      ...validation.data,
      pendingUpdate: null,
      status: "approved",
    });

    return res.status(200).json({
      success: true,
      message: "Hostel edit approved successfully.",
    });
  } catch (err) {
    return sendServerError(res, "Approve hostel edit", err);
  }
};