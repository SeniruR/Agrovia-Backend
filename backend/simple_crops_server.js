const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5002; // Use a different port

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

const CSV_PATH = 'D:\\Agrovia\\agrovia-backend\\data\\daily-crop-prices.csv';

function getCropsFromCSV() {
  try {
    if (!fs.existsSync(CSV_PATH)) {
      console.log('CSV file not found');
      return [];
    }
    
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csvContent.split('\n').slice(1); // Skip header
    const cropsMap = new Map();
    
    lines.forEach(line => {
      if (line.trim()) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const cropName = parts[1].trim();
          const category = parts[2].trim();
          if (cropName && category) {
            cropsMap.set(cropName.toLowerCase(), {
              name: cropName,
              category: category
            });
          }
        }
      }
    });
    
    return Array.from(cropsMap.entries()).map(([key, value]) => ({
      id: key.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      name: value.name,
      category: value.category,
      displayName: value.name
    }));
  } catch (error) {
    console.error('Error reading CSV:', error);
    return [];
  }
}

// Test endpoint
app.get('/crops', (req, res) => {
  try {
    const availableCrops = getCropsFromCSV();
    
    if (availableCrops.length > 0) {
      console.log(`Found ${availableCrops.length} crops`);
      res.json({
        success: true,
        crops: availableCrops.map(crop => crop.id),
        cropsData: availableCrops,
        count: availableCrops.length
      });
    } else {
      res.json({
        success: false,
        error: 'No crops found in CSV',
        crops: [],
        count: 0
      });
    }
  } catch (error) {
    console.error('Error reading crops:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read crop data',
      crops: [],
      count: 0
    });
  }
});

// Mock forecast endpoint for testing
app.post('/forecast', (req, res) => {
  try {
    const { crop, timePeriod = '1w' } = req.body;
    
    if (!crop) {
      return res.status(400).json({ error: 'Crop name is required' });
    }

    // Determine number of days based on timePeriod
    let days = 7;
    switch (timePeriod) {
      case '1w': days = 7; break;
      case '2w': days = 14; break;
      case '1m': days = 30; break;
      case '3m': days = 90; break;
      case '6m': days = 180; break;
      case '1y': days = 365; break;
      default: days = 7;
    }

    // Generate mock forecast data
    const forecast = [];
    const basePrice = 100 + Math.random() * 200; // Random base price
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Generate price with some variation
      const variation = (Math.random() - 0.5) * 20; // ±10%
      const price = basePrice + (i * 2) + variation; // Slight upward trend with noise
      const confidence = Math.max(70, 95 - (i * 2)); // Decreasing confidence
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        price: Math.max(10, price),
        confidence: Math.round(confidence)
      });
    }
    
    console.log(`Generated ${forecast.length} day forecast for ${crop}`);
    
    res.json({ 
      success: true,
      crop: crop,
      timePeriod: timePeriod,
      forecast: forecast 
    });
    
  } catch (error) {
    console.error('Error generating forecast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Test API running on http://localhost:${PORT}`);
  console.log(`Test crops: http://localhost:${PORT}/crops`);
});
