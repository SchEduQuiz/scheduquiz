# Authentication Functions

## Overview
This directory contains authentication-related edge functions that handle password reset requests and session management.

## Functions

### 1. password-reset-request
**Purpose**: Handle user password reset requests
**Features**:
- Submit password reset requests
- Request reason tracking
- Security logging (IP, user agent)
- Duplicate request prevention (1-hour cooldown)
- Email existence verification (without disclosure)
- Request tracking and audit trail

**API Parameters**:
- `email` - User email address
- `reason` - Optional reset reason
- `requestDetails` - Additional security information

**Security Features**:
- Email enumeration prevention
- Rate limiting (1 request per hour)
- IP address logging
- User agent tracking
- Request details capture

### 2. password-reset-admin
**Purpose**: Admin operations for password reset management
**Features**:
- List password reset requests with filtering
- Get password reset statistics
- Approve/reject reset requests
- Generate temporary passwords
- Bulk process requests
- Admin action logging

**API Endpoints**:
- `GET /list` - List password reset requests
- `GET /stats` - Get reset request statistics
- `POST /approve` - Approve reset request
- `POST /reject` - Reject reset request
- `POST /generate-temp-password` - Generate temp password
- `POST /bulk-action` - Bulk process requests

**Admin Features**:
- Request status management
- Temporary password generation
- Admin notes and comments
- Bulk operations support
- Audit trail maintenance

### 3. password-reset-session
**Purpose**: Handle password reset session validation
**Features**:
- Validate reset tokens
- Complete password reset process
- Session management
- Security validation

## Password Reset Workflow

### User Request Flow
1. User submits reset request with email
2. System validates request and rate limits
3. Request stored in database
4. Admin receives notification (if configured)
5. User gets confirmation message

### Admin Processing Flow
1. Admin reviews pending requests
2. Admin can approve/reject with notes
3. System generates temporary password
4. Admin communicates password to user
5. User completes password reset

### Session Management
1. Temporary password provided to user
2. User validates session token
3. Password reset completed
4. Session invalidated after use

## Security Features

### Request Security
- Email enumeration protection
- Rate limiting (1 request/hour)
- IP address and user agent logging
- Request reason tracking
- Security metadata capture

### Admin Security
- Admin role verification
- Action logging and audit trail
- Bulk operation controls
- Approval/rejection tracking
- Temporary password management

### Session Security
- Token validation
- Expiration handling
- One-time use tokens
- Session cleanup
- Failed attempt tracking

## Database Schema

### password_reset_requests
- `id` - Primary key
- `user_id` - User identifier
- `user_email` - User email
- `reason` - Reset reason
- `status` - Request status
- `admin_id` - Processing admin
- `temp_password` - Temporary password
- `ip_address` - Request IP
- `user_agent` - Request user agent
- `created_at/updated_at` - Timestamps

### password_reset_logs
- `id` - Primary key
- `request_id` - Request reference
- `user_id` - User identifier
- `action_type` - Action type
- `action_description` - Action details
- `admin_id` - Admin identifier
- `metadata` - Additional data
- `timestamp` - Action timestamp

## Integration Points
- User authentication system
- Email notification service
- Admin dashboard
- Security monitoring
- Audit logging system
