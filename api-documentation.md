# User Management API Documentation

## Overview

This API provides user management functionality for the application.

## Endpoints

### GET /users/:id
Get user by ID

**Parameters:**
- `id` (number) - User ID

**Returns:**
- `User` object with id, name, and email

**Example:**
```javascript
const user = await userAPI.getUser(1);
// Returns: { id: 1, name: "John Doe", email: "john@example.com" }
```

### POST /users
Create new user

**Parameters:**
- `userData` (Object) - User data
  - `name` (string) - User name
  - `email` (string) - User email

**Returns:**
- `User` object with generated ID

**Example:**
```javascript
const newUser = await userAPI.createUser({
  name: "Jane Smith",
  email: "jane@example.com"
});
```

### PUT /users/:id
Update user

**Parameters:**
- `id` (number) - User ID
- `updates` (Object) - Updates to apply

**Returns:**
- `User` object with applied updates

**Example:**
```javascript
const updatedUser = await userAPI.updateUser(1, {
  name: "John Updated"
});
```

## Data Models

### User
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---
*Generated on 2025-09-19 17:39*