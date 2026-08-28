# Messaging & Communication Functions

## Overview
This directory contains messaging and communication edge functions that handle announcements and notifications for the platform.

## Functions

### 1. announcement-handler
**Purpose**: Course announcement management system
**Features**:
- Create announcements for courses
- Automatic notification distribution to enrolled students
- List announcements by course
- Delete announcements
- Teacher role verification required

**API Endpoints**:
- `create` - Create new announcement
- `list` - List announcements for a course
- `delete` - Delete announcement

**Workflow**:
1. Teacher creates announcement
2. System automatically creates notifications for all enrolled students
3. Notifications include link to course announcement
4. Students receive real-time notifications

### 2. notification-management
**Purpose**: Comprehensive notification management
**Features**:
- Create notifications for users
- Mark individual notifications as read
- Mark all notifications as read
- List user notifications with pagination
- Get unread notification count
- Delete notifications
- Real-time notification tracking

**API Endpoints**:
- `create` - Create notification
- `mark_read` - Mark specific notification as read
- `mark_all_read` - Mark all user notifications as read
- `list` - Get user notifications
- `get_unread_count` - Get unread notification count
- `delete` - Delete notification

**Notification Types**:
- `announcement` - Course announcements
- `assignment` - Assignment updates
- `grade` - Grading notifications
- `system` - System messages
- `reminder` - Study reminders

## Notification System

### Features
- Real-time delivery
- Read/unread status tracking
- Automatic cleanup (optional)
- Rich content support (title, message, link)
- Batch operations support

### Notification Flow
1. Event triggers notification creation
2. Notification stored in database
3. Real-time push to user (if enabled)
4. User interface displays notification
5. Mark as read on user interaction
6. Optional deletion/archival

### Security
- User authentication required
- Notification ownership validation
- Role-based access (teachers can create for their students)
- Automatic enrollment verification

## Integration Points
- Assignment system (automatic submission notifications)
- Grading system (automatic grade notifications)
- Announcement system (automatic distribution)
- Course management (student enrollment sync)

## Performance
- Batch notification creation
- Efficient unread count queries
- Pagination for large notification lists
- Index optimization for queries
