# Authentication API Implementation Guide

This guide provides detailed instructions on how to set up and use the API_JS-USER authentication system properly. Follow these steps to ensure secure implementation.

## Required Environment Variables

Create a `.env` file in your project root with these variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGO_URI=Your db monggo db

# JWT Configuration
JWT_SECRET=YOur secret
JWT_EXPIRES_IN='1h'
JWT_REFRESH_EXPIRES_IN='7d'

# Google OAuth Configuration
GOOGLE_CLIENT_ID=Your Client id
GOOGLE_CLIENT_SECRET=Your Secret 


# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5050,http://localhost:5000
```

## Project Setup

1. Install required dependencies:

```bash
npm install express mongoose jsonwebtoken cookie-parser cors helmet compression morgan dotenv google-auth-library
```

2. Set up your MongoDB database:
   - Make sure your MongoDB instance is running
   - The system will automatically create required collections

3. Start the server:

```bash
npm start
```

## API Endpoints Reference

### Google OAuth Authentication

#### 1. Client-Side Google Authentication

**Endpoint:** `POST /api/auth/google`

**Description:** Authenticate with Google ID token obtained from client-side Google authentication.

**Request:**
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFiYjk2MDVjMzZlOThlMz..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6073a05f789c123456789012",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "user",
      "googleProfilePic": "https://lh3.googleusercontent.com/a/...",
      "isActive": true
    }
  }
}
```

### User Management

#### 2. Get Current User Profile

**Endpoint:** `GET /api/auth/me`

**Description:** Get the profile of the currently authenticated user.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6073a05f789c123456789012",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "user",
      "googleProfilePic": "https://lh3.googleusercontent.com/a/...",
      "isActive": true
    }
  }
}
```

### Token Management

#### 3. Refresh Access Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Get a new access token using a valid refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6073a05f789c123456789012",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "user",
      "googleProfilePic": "https://lh3.googleusercontent.com/a/...",
      "isActive": true
    }
  }
}
```

#### 4. Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Invalidate both access and refresh tokens.

**Request:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Health Check

#### 5. API Health Status

**Endpoint:** `GET /health`

**Description:** Check if the API is up and running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-05-14T12:00:00.000Z"
}
```

## Frontend Integration Example

Here's a complete example showing how to integrate this authentication API with a frontend:

```javascript
// Authentication Service

const API_URL = 'http://localhost:5000/api';

// Store tokens - in production use a more secure approach
const tokenStorage = {
  setAccessToken(token) {
    localStorage.setItem('accessToken', token);
  },
  
  getAccessToken() {
    return localStorage.getItem('accessToken');
  },
  
  setRefreshToken(token) {
    // In production, this should be an HTTP-only cookie
    localStorage.setItem('refreshToken', token);
  },
  
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  },
  
  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

// Google login
async function handleGoogleLogin(idToken) {
  try {
    const response = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id_token: idToken })
    });
    
    const data = await response.json();
    
    if (data.success) {
      tokenStorage.setAccessToken(data.data.accessToken);
      tokenStorage.setRefreshToken(data.data.refreshToken);
      return data.data.user;
    } else {
      throw new Error(data.message || 'Authentication failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Get user profile
async function getUserProfile() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${tokenStorage.getAccessToken()}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // If unauthorized, try to refresh the token
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry with new token
          return getUserProfile();
        }
      }
      throw new Error(data.message || 'Failed to get profile');
    }
    
    return data.data.user;
  } catch (error) {
    console.error('Profile fetch error:', error);
    throw error;
  }
}

// Refresh token
async function refreshToken() {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;
  
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    
    if (data.success) {
      tokenStorage.setAccessToken(data.data.accessToken);
      return true;
    } else {
      // If refresh failed, clear tokens and redirect to login
      tokenStorage.clearTokens();
      return false;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    tokenStorage.clearTokens();
    return false;
  }
}

// Logout
async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        accessToken: tokenStorage.getAccessToken(),
        refreshToken: tokenStorage.getRefreshToken()
      })
    });
    
    // Clear tokens regardless of server response
    tokenStorage.clearTokens();
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    // Clear tokens even if server request fails
    tokenStorage.clearTokens();
    return false;
  }
}
```

## Common Issues and Troubleshooting

### 1. CORS Issues

If you encounter CORS errors:
- Verify the frontend origin is included in the `ALLOWED_ORIGINS` environment variable
- Make sure credentials are included in fetch requests with `credentials: 'include'`
- Check that your CORS configuration includes the necessary headers

### 2. Token Refresh Problems

If token refresh isn't working:
- Check that you're sending the refresh token with the correct parameter name (`refreshToken`)
- Verify that the refresh token is stored correctly and accessible
- Look for any error messages in the server logs related to token validation

### 3. MongoDB Connection Issues

If your MongoDB connection fails:
- Verify your connection string in the `.env` file is correct
- Check if your database server is accessible from your application
- Ensure proper authentication credentials are provided

### 4. Google Authentication Problems

If Google authentication fails:
- Verify your Google API credentials are correct
- Check that your Google OAuth consent screen is properly configured
- Make sure the redirect URI matches exactly what's configured in Google Console

## Security Best Practices

1. **Access Token Storage:**
   - Store access tokens in memory when possible instead of localStorage
   - For SPAs, consider using in-memory storage with short token expiration

2. **Refresh Token Storage:**
   - Always store refresh tokens in HTTP-only, secure cookies
   - Never store refresh tokens in localStorage or sessionStorage

3. **HTTPS:**
   - Always use HTTPS in production environments
   - Set the `secure` flag on cookies

4. **Token Expiration:**
   - Keep access tokens short-lived (1 hour or less)
   - Implement proper token refresh mechanisms

5. **CORS Settings:**
   - Restrict CORS to only necessary origins
   - Use specific allowed methods and headers

6. **JWT Secret:**
   - Use a strong, randomly generated JWT secret
   - Consider rotating JWT secrets periodically