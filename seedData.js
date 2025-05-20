const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB Connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/iot-monitoring",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Device Schema
const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  deviceName: { type: String },
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Create a compound index for deviceId and timestamp
deviceSchema.index({ deviceId: 1, timestamp: 1 }, { unique: true });

const Device = mongoose.model("Device", deviceSchema);

// House locations with their typical temperature and humidity ranges
const locations = [
  {
    id: "001",
    name: "Living Room",
    tempRange: { min: 20, max: 24 },
    humidityRange: { min: 40, max: 60 },
  },
  {
    id: "002",
    name: "Master Bedroom",
    tempRange: { min: 18, max: 22 },
    humidityRange: { min: 45, max: 55 },
  },
  {
    id: "003",
    name: "Kitchen",
    tempRange: { min: 22, max: 26 },
    humidityRange: { min: 35, max: 50 },
  },
  {
    id: "004",
    name: "Bathroom",
    tempRange: { min: 22, max: 25 },
    humidityRange: { min: 50, max: 70 },
  },
  {
    id: "005",
    name: "Dining Room",
    tempRange: { min: 20, max: 24 },
    humidityRange: { min: 40, max: 60 },
  },
  {
    id: "006",
    name: "Guest Room",
    tempRange: { min: 20, max: 23 },
    humidityRange: { min: 45, max: 55 },
  },
  {
    id: "007",
    name: "Home Office",
    tempRange: { min: 21, max: 24 },
    humidityRange: { min: 40, max: 55 },
  },
  {
    id: "008",
    name: "Basement",
    tempRange: { min: 18, max: 21 },
    humidityRange: { min: 50, max: 65 },
  },
  {
    id: "009",
    name: "Garage",
    tempRange: { min: 15, max: 25 },
    humidityRange: { min: 30, max: 60 },
  },
  {
    id: "010",
    name: "Garden Room",
    tempRange: { min: 19, max: 23 },
    humidityRange: { min: 45, max: 65 },
  },
];

// Function to generate random number within range
const getRandomInRange = (min, max) => {
  return Math.random() * (max - min) + min;
};

// Function to generate data points for a device
const generateDeviceData = async (location) => {
  const deviceId = `DEV${location.id}`;
  const dataPoints = [];
  const now = new Date();

  // Generate 48 data points (24 hours, 2 per hour)
  for (let i = 0; i < 48; i++) {
    // Each point is 30 minutes apart, starting from 24 hours ago up to now
    const timestamp = new Date(now.getTime() - (47 - i) * 30 * 60 * 1000);
    const temperature = getRandomInRange(
      location.tempRange.min,
      location.tempRange.max
    );
    const humidity = getRandomInRange(
      location.humidityRange.min,
      location.humidityRange.max
    );

    dataPoints.push({
      deviceId,
      deviceName: location.name,
      temperature: parseFloat(temperature.toFixed(1)),
      humidity: parseFloat(humidity.toFixed(1)),
      timestamp,
    });
  }

  // Insert all data points
  try {
    await Device.insertMany(dataPoints, { ordered: false });
    console.log(
      `Successfully added ${dataPoints.length} data points for ${location.name}`
    );
  } catch (error) {
    if (error.writeErrors) {
      console.log(
        `Added ${
          dataPoints.length - error.writeErrors.length
        } data points for ${location.name}`
      );
    } else {
      console.error(`Error adding data for ${location.name}:`, error.message);
    }
  }
};

// Main function to seed the database
const seedDatabase = async () => {
  try {
    // Drop all indexes
    await Device.collection.dropIndexes();
    console.log("Dropped all indexes");

    // Clear existing data
    await Device.deleteMany({});
    console.log("Cleared existing data");

    // Generate data for each location
    for (const location of locations) {
      await generateDeviceData(location);
    }

    console.log("Database seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

// Run the seeding function
seedDatabase();
