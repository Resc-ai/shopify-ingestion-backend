require('dotenv').config();
const express = require('express');
const app = express();
const shopifyRoutes = require('./routes/shopify');
const reportsRouter = require("./routes/reports");
const profileRoutes = require("./routes/profile");
const cors = require("cors");

app.use(cors({
  origin: "http://localhost:3000", // your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use('/shopify', shopifyRoutes);
app.use("/shopify/reports", reportsRouter);
app.use("/shopify/profile", profileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
