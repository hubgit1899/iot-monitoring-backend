const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Root path handler
app.get("/", (req, res) => {
  res.status(200).json({ message: "IoT Monitoring System API" });
});

// MongoDB Connection with retry logic
const connectWithRetry = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/iot-monitoring",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("MongoDB Connected");
  } catch (err) {
    console.log("MongoDB Connection Error:", err);
    console.log("Retrying in 5 seconds...");
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

// Device Schema
const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  deviceName: { type: String },
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Device = mongoose.model("Device", deviceSchema);

// Routes
app.post("/api/devices", async (req, res) => {
  try {
    const { deviceId, deviceName, temperature, humidity } = req.body;

    // Validate required fields
    if (!deviceId) {
      return res.status(400).json({ message: "Device ID is required" });
    }
    if (!temperature || isNaN(temperature)) {
      return res.status(400).json({ message: "Valid temperature is required" });
    }
    if (!humidity || isNaN(humidity)) {
      return res.status(400).json({ message: "Valid humidity is required" });
    }

    // Validate device ID format
    if (!deviceId.startsWith("DEV")) {
      return res
        .status(400)
        .json({ message: "Device ID must start with 'DEV'" });
    }

    // Check if device exists
    const existingDevice = await Device.findOne({ deviceId });

    if (existingDevice) {
      // If device exists, add new reading
      const newReading = new Device({
        deviceId,
        deviceName: deviceName || existingDevice.deviceName, // Keep existing name if not provided
        temperature,
        humidity,
      });
      await newReading.save();
      res.status(201).json(newReading);
    } else {
      // If device doesn't exist, create new device
      const device = new Device({
        deviceId,
        deviceName,
        temperature,
        humidity,
      });
      await device.save();
      res.status(201).json(device);
    }
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/devices/latest", async (req, res) => {
  try {
    // Get all unique device IDs
    const deviceIds = await Device.distinct("deviceId");

    // For each device, get only the latest reading
    const devices = await Promise.all(
      deviceIds.map(async (deviceId) => {
        const latestReading = await Device.findOne({ deviceId })
          .sort({ timestamp: -1 })
          .limit(1);
        return latestReading;
      })
    );

    // Filter out any null values and sort by timestamp
    const validDevices = devices
      .filter((device) => device !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json(validDevices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/devices/history", async (req, res) => {
  try {
    // Get all unique device IDs
    const deviceIds = await Device.distinct("deviceId");

    // For each device, get the last 48 data points
    const allDevicesData = await Promise.all(
      deviceIds.map(async (deviceId) => {
        const deviceData = await Device.find({ deviceId })
          .sort({ timestamp: -1 })
          .limit(48);
        return deviceData;
      })
    );

    // Flatten the array of arrays and sort by timestamp
    const devices = allDevicesData
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/devices/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await Device.deleteMany({ deviceId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Device not found" });
    }

    res.json({ message: "Device deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
