# Agrovia Backend API Documentation

## Overview

Agrovia is a backend API system designed for agricultural communities, supporting user registration and authentication with role-based access control. The system supports five user roles: farmer, organization committee member, admin, moderator, and viewer.

## Base URL

```
http://localhost:5000/api/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## User Roles

1. **farmer** - Agricultural farmers with land information
2. **organization_committee_member** - Committee members with certificate verification
3. **admin** - Full system access
4. **moderator** - Limited administrative access
5. **viewer** - Read-only access

## API Endpoints

### Health Check

#### GET /health
Check if the API is running

**Response:**
```json
{
  "success": true,
  "message": "Agrovia API is running",
  "timestamp": "2025-07-04T10:00:00.000Z",
  "version": "1.0.0"
}
```

---

### Authentication

#### POST /auth/register/farmer
Register a new farmer

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "contact_number": "0771234567",
  "district": "Colombo",
  "land_size": 2.5,
  "nic_number": "123456789V",
  "organization_committee_number": "ORG001"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Farmer registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "contact_number": "0771234567",
      "district": "Colombo",
      "land_size": 2.5,
      "nic_number": "123456789V",
      "role": "farmer",
      "organization_committee_number": "ORG001",
      "is_verified": false,
      "is_active": true,
      "created_at": "2025-07-04T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /auth/register/committee-member
Register a new organization committee member (requires certificate upload)

**Content-Type:** multipart/form-data

**Form Fields:**
- name: "Jane Smith"
- email: "jane.smith@example.com"
- password: "securePassword123"
- contact_number: "0771234568"
- district: "Gampaha"
- nic_number: "987654321V"
- organization_committee_number: "ORG001"
- certificate: [PDF/Image file]

**Response (201):**
```json
{
  "success": true,
  "message": "Organization committee member registered successfully",
  "data": {
    "user": {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "contact_number": "0771234568",
      "district": "Gampaha",
      "nic_number": "987654321V",
      "role": "organization_committee_member",
      "organization_committee_number": "ORG001",
      "certificate_path": "/uploads/certificate-1234567890-123456789.pdf",
      "is_verified": false,
      "is_active": true,
      "created_at": "2025-07-04T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /auth/login
User login

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "contact_number": "0771234567",
      "district": "Colombo",
      "land_size": 2.5,
      "nic_number": "123456789V",
      "role": "farmer",
      "organization_committee_number": "ORG001",
      "is_verified": false,
      "is_active": true,
      "created_at": "2025-07-04T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET /auth/profile
Get current user profile (requires authentication)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "contact_number": "0771234567",
      "district": "Colombo",
      "land_size": 2.5,
      "nic_number": "123456789V",
      "role": "farmer",
      "organization_committee_number": "ORG001",
      "is_verified": false,
      "is_active": true,
      "created_at": "2025-07-04T10:00:00.000Z"
    }
  }
}
```

#### GET /auth/users
Get all users (admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- page: (optional) Page number (default: 1)
- limit: (optional) Items per page (default: 50)
- role: (optional) Filter by role

**Response (200):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john.doe@example.com",
        "contact_number": "0771234567",
        "district": "Colombo",
        "role": "farmer",
        "is_verified": false,
        "is_active": true,
        "created_at": "2025-07-04T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1
    }
  }
}
```

---

### Organizations

#### GET /organizations
Get all organizations

**Query Parameters:**
- page: (optional) Page number (default: 1)
- limit: (optional) Items per page (default: 50)

**Response (200):**
```json
{
  "success": true,
  "message": "Organizations retrieved successfully",
  "data": {
    "organizations": [
      {
        "id": 1,
        "name": "Colombo Farmers Association",
        "committee_number": "ORG001",
        "district": "Colombo",
        "created_at": "2025-07-04T10:00:00.000Z",
        "updated_at": "2025-07-04T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1
    }
  }
}
```

#### GET /organizations/:committee_number
Get organization by committee number

**Response (200):**
```json
{
  "success": true,
  "message": "Organization retrieved successfully",
  "data": {
    "organization": {
      "id": 1,
      "name": "Colombo Farmers Association",
      "committee_number": "ORG001",
      "district": "Colombo",
      "created_at": "2025-07-04T10:00:00.000Z",
      "updated_at": "2025-07-04T10:00:00.000Z"
    }
  }
}
```

#### POST /organizations
Create new organization (admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "name": "Gampaha Farmers Association",
  "committee_number": "ORG002",
  "district": "Gampaha"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Organization created successfully",
  "data": {
    "organization": {
      "id": 2,
      "name": "Gampaha Farmers Association",
      "committee_number": "ORG002",
      "district": "Gampaha",
      "created_at": "2025-07-04T10:00:00.000Z",
      "updated_at": "2025-07-04T10:00:00.000Z"
    }
  }
}
```

#### PUT /organizations/:id
Update organization (admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "name": "Updated Farmers Association",
  "district": "Kalutara"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Organization updated successfully",
  "data": {
    "organization": {
      "id": 1,
      "name": "Updated Farmers Association",
      "committee_number": "ORG001",
      "district": "Kalutara",
      "created_at": "2025-07-04T10:00:00.000Z",
      "updated_at": "2025-07-04T10:01:00.000Z"
    }
  }
}
```

#### DELETE /organizations/:id
Delete organization (admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Organization deleted successfully"
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token is required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal Server Error"
}
```

---

## Rate Limiting

- **General endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes
- **File upload endpoints**: 10 requests per hour

## File Upload

- **Supported formats**: PDF, JPEG, JPG, PNG
- **Maximum file size**: 5MB
- **Upload endpoint**: Only for committee member registration
- **Storage**: Files are stored in the `/uploads` directory

## Data Validation

### Sri Lankan NIC Format
- Old format: 9 digits + V/X (e.g., 123456789V)
- New format: 12 digits (e.g., 123456789012)

### Contact Number Format
- Sri Lankan mobile numbers with optional country code
- Examples: 0771234567, +94771234567

### Password Requirements
- Minimum 8 characters
- Maximum 128 characters

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT token authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection prevention through parameterized queries

## Database Schema

### Users Table
- id (Primary Key)
- name, email, password
- contact_number, district, land_size
- nic_number (Unique)
- role (farmer, organization_committee_member, admin, moderator, viewer)
- organization_committee_number (Foreign Key)
- certificate_path
- is_verified, is_active
- created_at, updated_at

### Organizations Table
- id (Primary Key)
- name, committee_number (Unique), district
- created_at, updated_at

## Environment Variables

Required environment variables:
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Database connection
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRES_IN`: Token expiration time
- `BCRYPT_ROUNDS`: Password hashing rounds
- `MAX_FILE_SIZE`: Maximum upload file size
