# Crop Post API Documentation

## Overview
This API provides endpoints for managing crop posts in the Agrovia platform. Farmers can create, read, update, and delete their crop listings.

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Crop Post
**POST** `/crop-posts`

**Authentication:** Required (Farmer only)

**Content-Type:** `multipart/form-data`

**Request Body:**
- `cropName` (string, required): Name of the crop (2-100 characters)
- `cropCategory` (string, required): Either "vegetables" or "grains"
- `variety` (string, optional): Variety/type of crop (max 100 characters)
- `quantity` (number, required): Available quantity (positive number)
- `unit` (string, required): Unit of measurement ("kg", "g", "tons", "bags", "pieces", "bunches")
- `pricePerUnit` (number, required): Price per unit (positive number)
- `harvestDate` (string, required): Harvest date in ISO format (YYYY-MM-DD)
- `expiryDate` (string, optional): Expiry date in ISO format (must be after harvest date)
- `location` (string, required): Detailed location/address (10-500 characters)
- `district` (string, required): Sri Lankan district name
- `description` (string, optional): Description of the crop (max 1000 characters)
- `farmerName` (string, required): Farmer's name (2-100 characters)
- `contactNumber` (string, required): Sri Lankan phone number format (+94xxxxxxxxx or 0xxxxxxxxx)
- `email` (string, optional): Email address
- `organicCertified` (boolean, optional): Whether the crop is organic certified
- `pesticideFree` (boolean, optional): Whether the crop is pesticide free
- `freshlyHarvested` (boolean, optional): Whether the crop is freshly harvested
- `images` (files, optional): Up to 5 image files (max 5MB each)

**Response:**
```json
{
  "success": true,
  "message": "Crop post created successfully",
  "data": {
    "insertId": 123
  }
}
```

### 2. Get All Crop Posts
**GET** `/crop-posts`

**Authentication:** Not required

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "farmer_id": 123,
        "crop_name": "Tomato",
        "crop_category": "vegetables",
        "variety": "Cherry Tomato",
        "quantity": 100,
        "unit": "kg",
        "price_per_unit": 250.50,
        "harvest_date": "2025-01-15",
        "expiry_date": "2025-01-25",
        "location": "Maharagama, near the main market",
        "district": "Colombo",
        "description": "Fresh organic cherry tomatoes",
        "farmer_name": "Sunil Perera",
        "contact_number": "+94771234567",
        "email": "sunil.perera@example.com",
        "organic_certified": true,
        "pesticide_free": true,
        "freshly_harvested": true,
        "images": ["image1.jpg", "image2.jpg"],
        "status": "active",
        "created_at": "2025-01-10T10:30:00.000Z",
        "updated_at": "2025-01-10T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 50,
      "items_per_page": 10
    }
  }
}
```

### 3. Search Crop Posts
**GET** `/crop-posts/search`

**Authentication:** Not required

**Query Parameters:**
- `crop_name` (string, optional): Search by crop name (partial match)
- `crop_category` (string, optional): Filter by category ("vegetables" or "grains")
- `district` (string, optional): Filter by district
- `min_price` (number, optional): Minimum price filter
- `max_price` (number, optional): Maximum price filter
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

**Response:** Same format as "Get All Crop Posts"

### 4. Get Crop Post by ID
**GET** `/crop-posts/:id`

**Authentication:** Not required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "farmer_id": 123,
    "crop_name": "Tomato",
    // ... (same fields as in the list response)
  }
}
```

### 5. Get Farmer's Crop Posts
**GET** `/crop-posts/farmer/my-posts`

**Authentication:** Required (Farmer only)

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

**Response:** Same format as "Get All Crop Posts" but filtered to current farmer

### 6. Update Crop Post
**PUT** `/crop-posts/:id`

**Authentication:** Required (Farmer - own posts only)

**Content-Type:** `multipart/form-data`

**Request Body:** Same fields as Create Crop Post (all optional)

**Response:**
```json
{
  "success": true,
  "message": "Crop post updated successfully"
}
```

### 7. Delete Crop Post
**DELETE** `/crop-posts/:id`

**Authentication:** Required (Farmer - own posts only)

**Response:**
```json
{
  "success": true,
  "message": "Crop post deleted successfully"
}
```

### 8. Get Crop Statistics
**GET** `/crop-posts/statistics`

**Authentication:** Not required

**Response:**
```json
{
  "success": true,
  "data": {
    "total_posts": 150,
    "by_category": [
      {
        "crop_category": "vegetables",
        "count": 100
      },
      {
        "crop_category": "grains",
        "count": 50
      }
    ],
    "by_district": [
      {
        "district": "Colombo",
        "count": 45
      },
      {
        "district": "Kandy",
        "count": 30
      }
    ],
    "recent_posts": 25
  }
}
```

### 9. Update Crop Post Status (Admin Only)
**PUT** `/crop-posts/:id/status`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "status": "active" // or "inactive", "pending", "rejected", "deleted"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Crop post status updated successfully"
}
```

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "cropName",
      "message": "Crop name is required"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### Authorization Error (403)
```json
{
  "success": false,
  "message": "Access denied. Farmers only."
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "message": "Crop post not found"
}
```

### File Upload Error (400)
```json
{
  "success": false,
  "message": "File size too large. Maximum size is 5MB per file."
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Valid Districts
The following Sri Lankan districts are accepted:
- Colombo, Gampaha, Kalutara, Kandy, Matale, Nuwara Eliya
- Galle, Matara, Hambantota, Jaffna, Kilinochchi, Mannar
- Vavuniya, Mullaitivu, Batticaloa, Ampara, Trincomalee
- Kurunegala, Puttalam, Anuradhapura, Polonnaruwa, Badulla
- Moneragala, Ratnapura, Kegalle

## Phone Number Format
Phone numbers must be in Sri Lankan format:
- `+94771234567` (with country code)
- `0771234567` (local format)

## File Upload Specifications
- **Accepted formats:** JPEG, PNG, GIF, WebP
- **Maximum file size:** 5MB per file
- **Maximum files:** 5 files per crop post
- **Field name:** `images` (array of files)

## Usage Examples

### Creating a crop post with JavaScript (Frontend)
```javascript
const formData = new FormData();
formData.append('cropName', 'Tomato');
formData.append('cropCategory', 'vegetables');
formData.append('quantity', '100');
formData.append('unit', 'kg');
formData.append('pricePerUnit', '250.50');
formData.append('harvestDate', '2025-01-15');
formData.append('location', 'Maharagama, near the main market');
formData.append('district', 'Colombo');
formData.append('farmerName', 'Sunil Perera');
formData.append('contactNumber', '+94771234567');
formData.append('organicCertified', true);

// Add images
const imageFiles = document.getElementById('imageInput').files;
for (let i = 0; i < imageFiles.length; i++) {
  formData.append('images', imageFiles[i]);
}

const response = await fetch('http://localhost:5000/api/v1/crop-posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`
  },
  body: formData
});

const result = await response.json();
```

### Searching crops
```javascript
const params = new URLSearchParams({
  crop_name: 'tomato',
  crop_category: 'vegetables',
  district: 'Colombo',
  page: '1',
  limit: '20'
});

const response = await fetch(`http://localhost:5000/api/v1/crop-posts/search?${params}`);
const result = await response.json();
```
