const admin = require("firebase-admin");

// ONLY ONE FILE
const serviceAccount = require("./hostel-finder-e4aef-firebase-adminsdk-fbsvc-76ead5cc1d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log("🔥 Firebase connected to:", serviceAccount.project_id);

module.exports = db;