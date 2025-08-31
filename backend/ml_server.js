const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));
app.use(express.json());

// Paths
const MODEL_PATH = path.join(__dirname, 'ml/trained_model.joblib');
const CSV_PATH = path.join(__dirname, '../data/daily-crop-prices.csv'); // Fixed path
const PYTHON_SCRIPT = path.join(__dirname, '../ml/price_forecaster.py');

// Function to get available crops from CSV dynamically
function getCropsFromCSV() {
  try {
    if (!fs.existsSync(CSV_PATH)) {
      console.log('CSV file not found, using default mappings');
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

// Train model endpoint
app.post('/train', async (req, res) => {
  try {
    console.log('Training model...');
    
    const pythonProcess = spawn('python', [PYTHON_SCRIPT]);
    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Model training completed');
        res.json({ 
          success: true, 
          message: 'Model trained successfully',
          output: output
        });
      } else {
        console.error('Model training failed:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Model training failed',
          details: error
        });
      }
    });
  } catch (error) {
    console.error('Error training model:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Forecast endpoint
app.post('/forecast', async (req, res) => {
  try {
    const { crop, timePeriod = '1w' } = req.body;
    
    if (!crop) {
      return res.status(400).json({ error: 'Crop name is required' });
    }

    // Get available crops from CSV
    const availableCrops = getCropsFromCSV();
    let selectedCrop = availableCrops.find(c => 
      c.id === crop.toLowerCase() || 
      c.name.toLowerCase().includes(crop.toLowerCase()) ||
      crop.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!selectedCrop) {
      // Fallback to the first crop that matches partially
      selectedCrop = availableCrops.find(c => 
        c.name.toLowerCase().includes(crop.toLowerCase().split('_')[0])
      );
    }

    if (!selectedCrop) {
      return res.status(400).json({ 
        error: `Crop '${crop}' not found in database`,
        available: availableCrops.slice(0, 10).map(c => c.name)
      });
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

    console.log(`Generating forecast for ${selectedCrop.name} (${selectedCrop.category}) for ${days} days`);

    // Check if Python script exists
    if (!fs.existsSync(PYTHON_SCRIPT)) {
      console.log('Python script not found, generating mock forecast data');
      
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
      
      return res.json({ 
        success: true,
        crop: selectedCrop.name,
        timePeriod: timePeriod,
        forecast: forecast,
        note: "Mock data - Python ML model not available"
      });
    }

    // Check if Python script exists
    if (!fs.existsSync(PYTHON_SCRIPT)) {
      console.log('Python script not found, generating mock forecast data');
      
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
      
      return res.json({ 
        success: true,
        crop: selectedCrop.name,
        timePeriod: timePeriod,
        forecast: forecast,
        note: "Mock data - Python ML model not available"
      });
    }

    const pythonProcess = spawn('python', [
      PYTHON_SCRIPT, 
      'predict', 
      selectedCrop.name, 
      selectedCrop.category, 
      days.toString()
    ]);

    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      if (error) console.log(`Python stderr: ${error}`);

      if (code === 0 && output.trim()) {
        try {
          const predictions = JSON.parse(output.trim());
          
          if (predictions.error) {
            console.error('Python script error:', predictions.error);
            res.status(500).json({ 
              success: false, 
              error: 'Model prediction failed',
              details: predictions.error
            });
            return;
          }
          
          // Transform for frontend format
          const forecast = predictions.map(pred => ({
            date: pred.date,
            price: pred.price,
            confidence: pred.confidence || 85
          }));
          
          res.json({ 
            success: true,
            crop: selectedCrop.name,
            timePeriod: timePeriod,
            forecast: forecast 
          });
        } catch (parseError) {
          console.error('Error parsing predictions:', parseError);
          console.error('Raw output:', output.trim());
          res.status(500).json({ 
            success: false, 
            error: 'Error parsing predictions',
            details: parseError.message
          });
        }
      } else {
        console.error('Prediction failed with code:', code);
        console.error('Python stderr:', error); // Log the actual error
        res.status(500).json({ 
          success: false, 
          error: 'Prediction failed',
          details: error || 'Unknown error from Python script'
        });
      }
    });

  } catch (error) {
    console.error('Error generating forecast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const modelExists = fs.existsSync(MODEL_PATH);
  const csvExists = fs.existsSync(CSV_PATH);
  
  res.json({
    status: 'ok',
    modelExists,
    csvExists,
    timestamp: new Date().toISOString()
  });
});

// Get available crops
app.get('/crops', (req, res) => {
  try {
    const availableCrops = getCropsFromCSV();
    
    if (availableCrops.length > 0) {
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

// Start server
app.listen(PORT, () => {
  console.log(`ML Forecast API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Train model: POST http://localhost:${PORT}/train`);
  console.log(`Get forecast: POST http://localhost:${PORT}/forecast`);
});

module.exports = app;
