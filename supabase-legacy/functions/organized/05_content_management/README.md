# Content Management Functions

## Overview
This directory contains content management edge functions that handle assignments, submissions, grading, and resource management.

## Functions

### 1. assignment-management
**Purpose**: Assignment creation and management
**Features**:
- Create assignments with due dates
- Update assignment details
- Delete assignments
- List assignments by course
- Automatic calendar event creation
- Due date reminders and notifications

**API Endpoints**:
- `create` - Create new assignment
- `update` - Update assignment details
- `delete` - Delete assignment
- `list` - List course assignments

**Assignment Fields**:
- Title and description
- Due date and time
- Points possible
- Assignment type
- Course association
- Attachment support

### 2. submission-handler
**Purpose**: Assignment submission management
**Features**:
- Submit assignments (text and file uploads)
- Update existing submissions
- List submissions for teachers
- Get student submission history
- Automatic notification to teachers
- Submission status tracking

**API Endpoints**:
- `submit` - Submit or update assignment
- `list` - List assignment submissions (teacher view)
- `get_student_submissions` - Get student submission history

**Submission Features**:
- Text and file submission support
- Multiple file uploads
- Submission history tracking
- Late submission handling
- Version control (updates replace previous)

### 3. grading-system
**Purpose**: Comprehensive grading and feedback system
**Features**:
- Grade submissions with points and feedback
- Update existing grades
- Get student grades by course
- Get course gradebook (teacher view)
- Automatic notification to students
- Grade history and audit trail

**API Endpoints**:
- `grade` - Grade a submission
- `get_grades` - Get student grades
- `get_course_gradebook` - Get course gradebook

**Grading Features**:
- Points-based grading
- Detailed feedback
- Grade history
- Grade calculations
- Progress tracking

### 4. resource-management
**Purpose**: Course resource and bookmark management
**Features**:
- Upload course resources
- List course resources
- Delete resources
- Bookmark lessons and resources
- Get user bookmarks
- Resource categorization and tagging

**API Endpoints**:
- `upload` - Upload resource
- `list` - List course resources
- `delete` - Delete resource
- `bookmark` - Toggle lesson bookmark
- `get_bookmarks` - Get user bookmarks

**Resource Features**:
- File upload and management
- Bookmark system with notes
- Resource sharing and access control
- Search and categorization
- Download tracking

## Workflow Integration

### Assignment Workflow
1. Teacher creates assignment with due date
2. System creates calendar event
3. Students receive notification
4. Students submit work (text/file)
5. Teacher receives submission notification
6. Teacher grades submission
7. Student receives grade notification
8. Grades appear in gradebook

### Resource Management
1. Teacher uploads course resources
2. Resources are categorized and indexed
3. Students can browse and download
4. Students can bookmark important resources
5. Bookmark management and organization

## Security
- Role-based access control
- File upload validation
- Resource ownership verification
- Submission authenticity
- Grade privacy and access control

## Performance
- Efficient file handling
- Batch operations support
- Query optimization
- Pagination for large lists
- Caching for frequently accessed data

## Integration Points
- Notification system for automatic alerts
- Calendar system for due date tracking
- File storage for uploads
- User management for access control
- Analytics for usage tracking
