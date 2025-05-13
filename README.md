# API_JS-USER Authentication API

A robust authentication service built with Express.js and MongoDB that provides secure user authentication with Google OAuth, JWT token management, and refresh token functionality.

## Features

- 🔐 Google OAuth 2.0 authentication
- 🔑 JWT-based authentication
- 🔄 Access & refresh token functionality
- ⏱️ Rate limiting to prevent brute force attacks
- 🛡️ Secure HTTP headers with Helmet
- 📦 Response compression
- 🌐 Configurable CORS
- 🔍 Detailed error handling
- 🚦 Health check endpoints

## Installation

```bash
# Clone the repository
git clone https://github.com/fathuur7/API_JS-USER.git
cd API_JS-USER

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configurations

# Start the server
npm start
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGO_URI=mongodb://username:password@host:port/database

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret


# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5050,http://localhost:5000
```

## API Endpoints

### Authentication

#### Google OAuth

```
GET /api/auth/google
```
Initiates Google OAuth authentication flow

```
GET /api/auth/google
```
Callback endpoint for Google OAuth

```
POST /api/auth/google
```
Client-side authentication with Google ID token

Request Body:
```json
{
  "id_token": "google_id_token_from_client"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "refresh_token",
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "user",
      "googleProfilePic": "https://profile-pic-url.jpg",
      "isActive": true
    }
  }
}
```

#### User Management

```
GET /api/auth/me
```
Get currently authenticated user profile

Headers:
```
Authorization: Bearer {access_token}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "user",
      "googleProfilePic": "https://profile-pic-url.jpg",
      "isActive": true
    }
  }
}
```

#### Token Management

```
POST /api/auth/refresh
```
Refresh access token

Request Body:
```json
{
  "refreshToken": "refresh_token"
}
```

Response:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_jwt_access_token",
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com"
    }
  }
}
```

```
POST /api/auth/logout
```
Invalidate tokens and logout

Request Body:
```json
{
  "accessToken": "access_token",
  "refreshToken": "refresh_token"
}
```

Response:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Health Check

```
GET /health
```
Check API health status

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-05-14T12:00:00.000Z"
}
```

## Frontend Integration

This API is designed to work with the provided OAuth frontend demo. Here's a simple example of how to integrate the authentication flow:

### Frontend HTML/JS

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Google OAuth Demo</title>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
<body>
  <!-- Google Sign-In Button -->
  <div id="g_id_onload"
       data-client_id="YOUR_GOOGLE_CLIENT_ID"
       data-callback="handleCredentialResponse">
  </div>
  <div class="g_id_signin"></div>

  <script>
    async function handleCredentialResponse(response) {
      const idToken = response.credential;
      
      // Send the ID token to your server
      const result = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id_token: idToken })
      });
      
      const data = await result.json();
      
      // Store tokens securely
      localStorage.setItem('accessToken', data.data.accessToken);
      // Refresh token should be stored in a secure HTTP-only cookie
    }
  </script>
</body>
</html>
```

## Security Notes

- Use HTTPS in production to prevent token theft
- Store refresh tokens in secure HTTP-only cookies
- Access tokens should be short-lived (1 hour recommended)
- Implement proper CORS configuration for production
- Keep your JWT_SECRET secure and complex

## Development

```bash
# Run in development mode with nodemon
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

## License

MIT
