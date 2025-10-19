# Agrovia Backend

A comprehensive Node.js + Express backend API for agricultural communities with JWT authentication and role-based access control.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Role-Based Access**: 5 user roles (farmer, organization committee member, admin, moderator, viewer)
- **File Uploads**: Secure certificate document uploads for committee members
- **Database Integration**: MySQL with Aiven cloud hosting
- **Security**: Rate limiting, CORS, helmet, input validation
- **Modular Structure**: Clean, maintainable code architecture

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MySQL database (Aiven cloud instance)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd agrovia-backend/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory with the provided configuration.

4. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Project Structure

```
backend/
├── config/
│   ├── database.js          # MySQL database configuration
│   └── upload.js            # Multer file upload configuration
├── controllers/
│   ├── authController.js    # User authentication logic
│   └── organizationController.js # Organization management
├── middleware/
│   ├── auth.js              # JWT authentication & authorization
│   ├── errorHandler.js      # Global error handling
│   ├── rateLimiter.js       # Rate limiting configuration
│   └── validation.js        # Input validation schemas
├── models/
│   ├── User.js              # User database operations
│   └── Organization.js      # Organization database operations
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── organizations.js     # Organization routes
│   └── index.js             # Route aggregation
├── uploads/                 # File upload directory
├── utils/
│   └── helpers.js           # Utility functions
├── server.js                # Application entry point
├── package.json
├── .env                     # Environment configuration
└── API_DOCUMENTATION.md     # API documentation
```

## User Roles

1. **farmer**: Agricultural farmers with land information
2. **organization_committee_member**: Committee members with certificate verification
3. **admin**: Full system access
4. **moderator**: Limited administrative access
5. **viewer**: Read-only access

## API Endpoints

### Authentication
- `POST /api/v1/auth/register/farmer` - Register farmer
- `POST /api/v1/auth/register/committee-member` - Register committee member (with file upload)
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile (protected)
- `GET /api/v1/auth/users` - Get all users (admin only)

### Organizations
- `GET /api/v1/organizations` - Get all organizations
- `GET /api/v1/organizations/:committee_number` - Get organization by committee number
- `POST /api/v1/organizations` - Create organization (admin only)
- `PUT /api/v1/organizations/:id` - Update organization (admin only)
- `DELETE /api/v1/organizations/:id` - Delete organization (admin only)

### Health Check
- `GET /api/v1/health` - API health status

## Database Tables

### Users
Required fields for farmers:
- name, email, password, contact_number, district, land_size, nic_number, organization_committee_number

Required fields for committee members:
- name, email, password, contact_number, district, nic_number, organization_committee_number, certificate (file upload)

### Organizations
- name, committee_number, district

## Security Features

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Input Validation**: Joi schema validation
- **CORS Protection**: Configurable cross-origin requests
- **File Upload Security**: Type and size validation
- **SQL Injection Prevention**: Parameterized queries

## Environment Configuration

The application requires the following environment variables:

```env
NODE_ENV=development
PORT=5000
DB_HOST=agrovia-sheharagamage2002-1cc3.c.aivencloud.com
DB_PORT=12267
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=AVNS_iOtAXIKDXzwb0S4k4dm
DB_SSL_MODE=REQUIRED
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## File Upload

- **Supported formats**: PDF, JPEG, JPG, PNG
- **Maximum size**: 5MB
- **Storage**: Local filesystem (uploads directory)
- **Access**: Files served via `/uploads` static route

## Error Handling

Comprehensive error handling with:
- MySQL error mapping
- JWT error handling
- Multer upload errors
- Validation errors
- Custom application errors

## Development

### Running in Development Mode
```bash
npm run dev
```

### Testing the API
Use the health check endpoint to verify the API is running:
```bash
curl http://localhost:5000/api/v1/health
```

### Database maintenance

The review image workflow stores base64-encoded blobs inside the `shop_reviews.attachments` column. Make sure your database schema uses a large text type for that field. Run the helper script below once per environment (development, staging, production) to expand the column to `LONGTEXT` if necessary:

```bash
node scripts/expand-shopreview-attachments.js
```

### Creating Sample Data
Before registering users, create organizations:
```bash
# Create organization (requires admin token)
curl -X POST http://localhost:5000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "name": "Colombo Farmers Association",
    "committee_number": "ORG001",
    "district": "Colombo"
  }'
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper CORS origins
4. Set up SSL certificates
5. Use a process manager (PM2)
6. Configure reverse proxy (nginx)
7. Set up monitoring and logging

## License

This project is licensed under the ISC License.

## Support

For technical support or questions, please refer to the API documentation or create an issue in the repository.
