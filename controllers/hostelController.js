
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
// HELPER: VALIDATE IMAGE URLS
// Accept HTTPS Cloudinary delivery URLs only.
// ======================================================
function validateImages(images) {
  if (images === undefined) {
    return {
      valid: true,
      images: undefined,
    };
  }

  if (!Array.isArray(images)) {
    return {
      valid: false,
      message: "Images must be an array of Cloudinary URLs.",
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
        message: "Every image must be a valid URL string.",
      };
    }

    try {
      const parsedUrl = new URL(image.trim());

      if (
        parsedUrl.protocol !== "https:" ||
        parsedUrl.hostname.toLowerCase() !==
          "res.cloudinary.com"
      ) {
        return {
          valid: false,
          message:
            "Images must use HTTPS Cloudinary delivery URLs.",
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
// HELPER: VALIDATE NUMERIC FIELDS
// ======================================================
function parseNonNegativeNumber(value, field) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return {
      valid: false,
      message: `${field} must be a valid non-negative number.`,
    };
  }

  return {
    valid: true,
    value: number,
  };
}

function parseCoordinate(value, field) {
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
// HELPER: VALIDATE EDIT REQUEST
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
        message: "Hostel name cannot be empty.",
      };
    }

    cleanUpdate.name = cleanUpdate.name.trim();
  }

  if (Object.hasOwn(cleanUpdate, "category")) {
    if (typeof cleanUpdate.category !== "string") {
      return {
        valid: false,
        message: "Category must be a string.",
      };
    }

    cleanUpdate.category = cleanUpdate.category.trim();
  }

  if (Object.hasOwn(cleanUpdate, "rent")) {
    const result = parseNonNegativeNumber(
      cleanUpdate.rent,
      "Rent"
    );

    if (!result.valid) return result;

    cleanUpdate.rent = result.value;
  }

  for (const field of ["latitude", "longitude"]) {
    if (Object.hasOwn(cleanUpdate, field)) {
      const result = parseCoordinate(
        cleanUpdate[field],
        field
      );

      if (!result.valid) return result;

      cleanUpdate[field] = result.value;
    }
  }

  if (Object.hasOwn(cleanUpdate, "images")) {
    const result = validateImages(cleanUpdate.images);

    if (!result.valid) return result;

    cleanUpdate.images = result.images;
  }

  if (Object.hasOwn(cleanUpdate, "facilities")) {
    if (
      !cleanUpdate.facilities ||
      typeof cleanUpdate.facilities !== "object" ||
      Array.isArray(cleanUpdate.facilities)
    ) {
      return {
        valid: false,
        message: "Facilities must be an object.",
      };
    }
  }

  for (const field of ["whatsapp", "email"]) {
    if (Object.hasOwn(cleanUpdate, field)) {
      if (typeof cleanUpdate[field] !== "string") {
        return {
          valid: false,
          message: `${field} must be a string.`,
        };
      }

      cleanUpdate[field] = cleanUpdate[field].trim();
    }
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

    const name =
      typeof data.name === "string"
        ? data.name.trim()
        : "";

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Hostel name is required.",
      });
    }

    const rentResult = parseNonNegativeNumber(
      data.rent ?? 0,
      "Rent"
    );

    if (!rentResult.valid) {
      return res.status(400).json({
        success: false,
        message: rentResult.message,
      });
    }

    const latitudeResult = parseCoordinate(
      data.latitude ?? 0,
      "latitude"
    );

    const longitudeResult = parseCoordinate(
      data.longitude ?? 0,
      "longitude"
    );

    if (!latitudeResult.valid) {
      return res.status(400).json({
        success: false,
        message: latitudeResult.message,
      });
    }

    if (!longitudeResult.valid) {
      return res.status(400).json({
        success: false,
        message: longitudeResult.message,
      });
    }

    const imageResult = validateImages(data.images);

    if (!imageResult.valid) {
      return res.status(400).json({
        success: false,
        message: imageResult.message,
      });
    }

    if (
      data.facilities !== undefined &&
      (
        !data.facilities ||
        typeof data.facilities !== "object" ||
        Array.isArray(data.facilities)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Facilities must be an object.",
      });
    }

    const newHostel = {
      name,
      rent: rentResult.value,

      category:
        typeof data.category === "string"
          ? data.category.trim()
          : "",

      facilities: data.facilities || {},

      latitude: latitudeResult.value,
      longitude: longitudeResult.value,

      whatsapp:
        typeof data.whatsapp === "string"
          ? data.whatsapp.trim()
          : "",

      email:
        typeof data.email === "string"
          ? data.email.trim()
          : "",

      images: imageResult.images || [],

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
//
// Body:
// {
//   "pendingUpdate": {
//     "name": "Updated Hostel",
//     "images": ["https://res.cloudinary.com/..."]
//   }
// }
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

    // Revalidate stored pending data before applying it.
    const validation = validateHostelChanges(pendingUpdate);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const updatedFields = validation.data;

    // Merge approved changes with existing hostel data.
    // Do not overwrite the document's ID or creation timestamp.
    await docRef.update({
      ...updatedFields,
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