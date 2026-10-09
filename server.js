require("dotenv").config();

const express = require("express");
const cors = require("cors");

const hostelRoutes = require("./routes/hostelRoutes");
const providerRoutes = require("./routes/providerRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

app.use(cors({
origin: "*"
}));

app.use(express.json());

// HOSTEL ROUTES
app.use("/hostels", hostelRoutes);

// UPLOAD ROUTES
app.use("/upload", uploadRoutes);

// PROVIDER ROUTES
app.use("/provider", providerRoutes);

// HOME
app.get("/", (req, res) => {
res.send("Backend is running 🚀");
});

// START SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
console.log(`Server running on port ${PORT}`);
});
