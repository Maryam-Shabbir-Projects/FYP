
const admin = require("firebase-admin");
const serviceAccount = require(
  "./hostel-finder-e4aef-firebase-adminsdk-fbsvc-76ead5cc1d.json"
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

console.log("Firebase initialized for project:", serviceAccount.project_id);

module.exports = db;