# Admin Functions

## Overview
This directory contains admin-only edge functions that provide administrative capabilities for the platform.

## Functions

### 1. admin-analytics
**Purpose**: Comprehensive platform analytics and insights
**Features**:
- Platform overview analytics (users, questions, activities, courses, enrollments)
- Detailed analytics with trend analysis
- Performance metrics and system health monitoring
- Admin role verification required

**API Endpoints**:
- `get_overview_analytics` - Platform overview statistics
- `get_detailed_analytics` - Detailed analytics across platform data
- `get_performance_metrics` - Performance and usage metrics
- `get_trend_analysis` - Historical data trend analysis
- `get_system_health` - System health metrics

### 2. admin-bulk-operations
**Purpose**: Efficient bulk operations for users and questions
**Features**:
- Bulk user updates and deletions
- Bulk question updates, deletions, and imports
- Admin action logging and audit trails
- Batch processing with error handling

**API Endpoints**:
- `bulk_update_users` - Update multiple users
- `bulk_delete_users` - Delete multiple users
- `bulk_update_questions` - Update multiple questions
- `bulk_delete_questions` - Delete multiple questions
- `bulk_import_questions` - Import questions in bulk
- `get_bulk_operation_preview` - Preview operations before execution

### 3. admin-manage-users
**Purpose**: User management operations for admins
**Features**:
- List all users with profiles
- Update user roles and status
- Delete users from auth system
- Admin role verification

**API Endpoints**:
- `list_users` - Get all users with profiles
- `update_role` - Update user role
- `delete_user` - Delete user

### 4. admin-question-management
**Purpose**: Question management for admins
**Features**:
- Question CRUD operations
- Question moderation and review
- Category and difficulty management

### 5. admin-user-management
**Purpose**: User management for admins
**Features**:
- User profile management
- Role assignment and changes
- User status management

### 6. create-admin-user
**Purpose**: Create admin users
**Features**:
- Create users with admin role
- Direct SQL or Admin API methods
- Email and password validation
- Role-based user creation

### 7. create-test-account
**Purpose**: Create test accounts for development
**Features**:
- Create test users with student, teacher, or admin roles
- Automatic profile creation
- Rollback on failures
- Development/testing purposes only

### 8. get-course-stats
**Purpose**: Get course statistics
**Features**:
- Total courses, enrollments, students, teachers
- Platform-wide statistics
- Real-time counts from database

## Security
- All functions require admin role verification
- Service role key required for database operations
- Admin actions are logged for audit trails
- CORS properly configured for web clients

## Error Handling
All functions follow consistent error handling patterns:
- Proper HTTP status codes (401 for auth, 403 for admin role, 500 for server errors)
- Structured error responses with codes and messages
- Comprehensive logging for debugging

## Dependencies
- Supabase URL and Service Role Key
- Admin role in profiles table
- Proper table permissions for admin operations
