# Customer Module

## Overview

The Customer module provides CRUD operations for managing customers with Mongoose and MongoDB. It includes automatic incremental `customerId` generation, unique indexes, and Zod validation.

## Features

- ✅ **Optimized auto-incrementing** `customerId` using atomic MongoDB operations (thread-safe, fast)
- ✅ Unique indexes on `customerId`, `email`, and `phone`
- ✅ Zod schema validation for request payloads
- ✅ Proper HTTP status codes and error messages
- ✅ Repository pattern for database operations
- ✅ Timestamps (createdAt, updatedAt) managed by Mongoose
- ✅ Customer status: `created` | `verified`
- ✅ **Production-ready** - handles high load and parallel requests

## Schema

```typescript
{
  name: string;           // Customer name
  customerId: number;     // Auto-incremented, unique numeric ID
  email: string;          // Unique email
  phone: string;          // Unique phone number (E.164 format)
  status: 'created' | 'verified';
  createdAt: Date;        // Auto-managed by Mongoose
  updatedAt: Date;        // Auto-managed by Mongoose
}
```

## API Endpoints

### 1. Create Customer

**POST** `/customers`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "customerId": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "status": "created",
    "createdAt": "2026-02-12T00:00:00.000Z",
    "updatedAt": "2026-02-12T00:00:00.000Z"
  },
  "message": "Customer created successfully"
}
```

**Error Response (409 Conflict):**
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Customer with this email already exists",
  "timestamp": "2026-02-12T00:00:00.000Z"
}
```

**Error Response (400 Bad Request - Validation):**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "path": ["email"],
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2026-02-12T00:00:00.000Z"
}
```

### 2. Get All Customers

**GET** `/customers`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "customerId": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "created",
      "createdAt": "2026-02-12T00:00:00.000Z",
      "updatedAt": "2026-02-12T00:00:00.000Z"
    }
  ],
  "message": "Customers retrieved successfully"
}
```

### 3. Get Customer by ID

**GET** `/customers/:id`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "customerId": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "status": "created",
    "createdAt": "2026-02-12T00:00:00.000Z",
    "updatedAt": "2026-02-12T00:00:00.000Z"
  },
  "message": "Customer retrieved successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Customer not found",
  "timestamp": "2026-02-12T00:00:00.000Z"
}
```

### 4. Update Customer Status

**PATCH** `/customers/:id/status`

**Request Body:**
```json
{
  "status": "verified"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "customerId": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "status": "verified",
    "createdAt": "2026-02-12T00:00:00.000Z",
    "updatedAt": "2026-02-12T00:00:00.000Z"
  },
  "message": "Customer status updated successfully"
}
```

## Validation Rules

### Name
- Minimum 2 characters
- Maximum 100 characters
- Required

### Email
- Must be valid email format
- Converted to lowercase automatically
- Unique constraint
- Required

### Phone
- Must match E.164 format: `+[country code][number]`
- Example: `+1234567890`
- Minimum 10 characters
- Maximum 15 characters
- Unique constraint
- Required

## Error Handling

The module returns appropriate HTTP status codes:

- **200 OK** - Successful GET/PATCH requests
- **201 Created** - Successful POST request
- **400 Bad Request** - Validation errors, invalid data, or not found
- **409 Conflict** - Duplicate email or phone number
- **500 Internal Server Error** - Unexpected server errors

## Module Structure

```
customer/
├── schemas/
│   └── customer.schema.ts      # Mongoose schema with auto-increment
├── dto/
│   ├── create-customer.dto.ts  # Zod validation schema
│   └── response-customer.dto.ts
├── pipes/
│   └── zod-validation.pipe.ts  # Custom Zod validation pipe
├── customer.repository.ts       # Database operations
├── customer.service.ts          # Business logic
├── customer.controller.ts       # HTTP endpoints
├── customer.module.ts           # NestJS module
└── README.md                    # This file
```

## Testing Examples

### Using curl

```bash
# Create a customer
curl -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }'

# Get all customers
curl http://localhost:3000/customers

# Get customer by ID
curl http://localhost:3000/customers/507f1f77bcf86cd799439011

# Update status
curl -X PATCH http://localhost:3000/customers/507f1f77bcf86cd799439011/status \
  -H "Content-Type: application/json" \
  -d '{"status": "verified"}'
```

## Dependencies

- `@nestjs/mongoose` - NestJS Mongoose integration
- `mongoose` - MongoDB ODM
- `zod` - Schema validation

## Notes

- The `customerId` is automatically generated using **atomic MongoDB counter** (thread-safe, production-ready)
- Counter implementation uses `findOneAndUpdate` with `$inc` - no race conditions even under high load
- Indexes are created on `customerId`, `email`, and `phone` for fast lookups
- All validation errors return detailed error messages in the response
- The module uses repository pattern for better testability and separation of concerns

### Performance & Atomicity

The auto-increment implementation uses a separate `counters` collection with atomic operations:
- **Thread-safe** - handles parallel requests correctly
- **Fast** - constant time O(1), no sorting required
- **Scalable** - works the same on 1K or 1M records
- **Transaction support** - guarantees no gaps in customerId sequence (requires MongoDB Replica Set)

**Two modes available:**
1. `create()` - with transactions (no ID gaps, requires replica set) ← **default**
2. `createFast()` - without transactions (faster, may skip IDs on errors, works on standalone MongoDB)

For detailed explanations:
- Counter implementation: [COUNTER_IMPLEMENTATION.md](./COUNTER_IMPLEMENTATION.md)
- Transactions vs No Transactions: [TRANSACTION_VS_NO_TRANSACTION.md](./TRANSACTION_VS_NO_TRANSACTION.md)
