const db = require("../config/firebase");

const hostelsRef = db.collection("hostels");


// ======================================================
// 🔥 ADD HOSTEL
// POST /hostels/
// ======================================================
exports.addHostel = async (req, res) => {
  try {
    const data = req.body;

    const newHostel = {
      name: data.name || "",

      rent: data.rent || 0,

      category: data.category || "",

      facilities: data.facilities || {},

      latitude: data.latitude || 0,

      longitude: data.longitude || 0,

      whatsapp: data.whatsapp || "",

      email: data.email || "",

      // ================================================
      // CLOUDINARY IMAGE URLS
      // MAXIMUM 3 IMAGES
      // ================================================
      images: Array.isArray(data.images)
        ? data.images.slice(0, 3)
        : [],

      // New hostel requires admin approval
      status: "pending",

      // No edit request initially
      pendingUpdate: null,

      createdAt: new Date()
    };

    const result = await hostelsRef.add(newHostel);

    res.status(201).json({
      success: true,
      id: result.id,
      message: "Hostel added successfully"
    });

  } catch (err) {
    console.error("Add hostel error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// ======================================================
// 🔥 GET APPROVED HOSTELS
// GET /hostels/
// ======================================================
exports.getHostels = async (req, res) => {
  try {
    const snapshot = await hostelsRef
      .where("status", "==", "approved")
      .get();

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(data);

  } catch (err) {
    console.error("Get hostels error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// ======================================================
// 🔥 GET MY HOSTELS
// GET /hostels/my/list?email=provider@gmail.com
// ======================================================
exports.getMyHostels = async (req, res) => {
  try {

    const email = req.query.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const snapshot = await hostelsRef
      .where("email", "==", email)
      .get();

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(data);

  } catch (err) {
    console.error("Get my hostels error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// ======================================================
// 🔥 GET PENDING HOSTELS
// GET /hostels/pending/list
// ======================================================
exports.getPendingHostels = async (req, res) => {
  try {

    const snapshot = await hostelsRef
      .where("status", "==", "pending")
      .get();

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(data);

  } catch (err) {
    console.error("Get pending hostels error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// ======================================================
// 🔥 GET SINGLE HOSTEL
// GET /hostels/:id
// ======================================================
exports.getHostelById = async (req, res) => {
  try {

    const id = req.params.id;

    const doc = await hostelsRef
      .doc(id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found"
      });
    }

    res.status(200).json({
      id: doc.id,
      ...doc.data()
    });

  } catch (err) {
    console.error("Get hostel error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// ======================================================
// 🔥 DELETE HOSTEL
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
        message: "Hostel not found"
      });
    }

    await docRef.delete();

    res.status(200).json({
      success: true,
      message: "Hostel deleted successfully"
    });

  } catch (err) {
    console.error("Delete hostel error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// ======================================================
// 🔥 APPROVE NEW HOSTEL
// PATCH /hostels/approve/:id
// ======================================================
exports.approveHostel = async (req, res) => {
  try {

    const id = req.params.id;

    const docRef = hostelsRef.doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found"
      });
    }

    await docRef.update({
      status: "approved"
    });

    res.status(200).json({
      success: true,
      message: "Hostel approved successfully"
    });

  } catch (err) {
    console.error("Approve hostel error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// ======================================================
// 🔥 UPDATE HOSTEL
// PUT /hostels/:id
//
// Provider sends:
// {
//   "pendingUpdate": {
//      ...
//   }
// }
// ======================================================
exports.updateHostel = async (req, res) => {
  try {

    const id = req.params.id;

    const docRef = hostelsRef.doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found"
      });
    }

    const { pendingUpdate } = req.body;

    if (
      !pendingUpdate ||
      Object.keys(pendingUpdate).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No changes provided"
      });
    }

    // ================================================
    // MAXIMUM 3 IMAGES
    // ================================================
    if (Array.isArray(pendingUpdate.images)) {
      pendingUpdate.images =
        pendingUpdate.images.slice(0, 3);
    }

    await docRef.update({
      pendingUpdate: pendingUpdate,

      status: "update_pending"
    });

    res.status(200).json({
      success: true,
      message: "Update request sent for admin approval"
    });

  } catch (err) {
    console.error("Update hostel error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// ======================================================
// 🔥 APPROVE EDIT REQUEST
// PATCH /hostels/approve-edit/:id
// ======================================================
exports.approveHostelEdit = async (req, res) => {
  try {

    const id = req.params.id;

    const docRef = hostelsRef.doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found"
      });
    }

    const data = doc.data();

    // ================================================
    // CHECK PENDING UPDATE
    // ================================================
    if (!data.pendingUpdate) {
      return res.status(400).json({
        success: false,
        message: "No pending update"
      });
    }

    const u = data.pendingUpdate;

    // ================================================
    // APPLY PENDING UPDATE
    // ================================================
    const updatedHostel = {

      ...data,

      name:
        u.name ?? data.name,

      rent:
        u.rent ?? data.rent,

      category:
        u.category ?? data.category,

      facilities:
        u.facilities ?? data.facilities,

      latitude:
        u.latitude ?? data.latitude,

      longitude:
        u.longitude ?? data.longitude,

      whatsapp:
        u.whatsapp ?? data.whatsapp,

      // ================================================
      // CLOUDINARY IMAGES
      // MAXIMUM 3
      // ================================================
      images:
        Array.isArray(u.images)
          ? u.images.slice(0, 3)
          : (data.images || []),

      pendingUpdate: null,

      status: "approved"
    };

    await docRef.set(
      updatedHostel,
      {
        merge: true
      }
    );

    res.status(200).json({
      success: true,
      message: "Edit approved successfully"
    });

  } catch (err) {
    console.error(
      "Approve hostel edit error:",
      err
    );

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};