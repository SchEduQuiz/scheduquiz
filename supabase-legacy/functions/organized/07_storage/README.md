# Storage Functions

## Overview
This directory contains storage-related edge functions that handle bucket creation and temporary storage setup.

## Functions

### 1. create-bucket-assignment-submissions-temp
**Purpose**: Create temporary bucket for assignment submissions
**Features**:
- Create storage bucket for student submissions
- Set up proper permissions and policies
- Configure file size limits
- Set up public access policies
- Temporary setup for migration/setup purposes

**Bucket Configuration**:
- Name: assignment-submissions
- File Types: All document types
- Size Limit: 10MB per file
- Access: Private with policy-based access
- Policies: Student upload, teacher access

### 2. create-bucket-avatars-temp
**Purpose**: Create temporary bucket for user avatars
**Features**:
- Create storage bucket for user profile images
- Configure image-specific settings
- Set up automatic optimization
- Configure public access for avatars
- Temporary setup for migration purposes

**Bucket Configuration**:
- Name: avatars
- File Types: Images (jpg, png, gif, webp)
- Size Limit: 2MB per file
- Access: Public read, authenticated upload
- Policies: User avatar management

### 3. create-bucket-course-materials-temp
**Purpose**: Create temporary bucket for course materials
**Features**:
- Create storage bucket for course resources
- Configure multi-file support
- Set up organization structure
- Configure access controls
- Temporary setup for migration purposes

**Bucket Configuration**:
- Name: course-materials
- File Types: All file types
- Size Limit: 50MB per file
- Access: Course-based access control
- Policies: Teacher upload, student access

## Storage Architecture

### Bucket Structure
```
storage/
├── avatars/           # User profile images
├── course-materials/  # Course resources
├── assignment-submissions/  # Student submissions
└── temporary/         # Temporary uploads
```

### Access Patterns

#### Public Access (Avatars)
- Anonymous read access
- Authenticated upload
- User ownership validation
- Image optimization

#### Course-Based Access
- Course enrollment verification
- Role-based access (teacher/student)
- Resource organization
- Sharing controls

#### Submission Access
- Student submission rights
- Teacher grading access
- File ownership validation
- Version control support

## Security Policies

### Row Level Security (RLS)
- User-based access controls
- Course enrollment verification
- Resource ownership validation
- Admin override capabilities

### Upload Validation
- File type restrictions
- Size limit enforcement
- Malware scanning (if enabled)
- Content validation

### Access Control
- Anonymous vs authenticated access
- Role-based permissions
- Resource sharing controls
- Audit logging

## Integration Points

### User Management
- Profile image management
- Avatar upload/update
- User preference storage
- Profile data synchronization

### Course Management
- Resource upload and sharing
- File organization
- Access control
- Version management

### Assignment System
- Submission file handling
- Grading access
- File feedback
- Archive management

## Migration Considerations

### Temporary Functions
These functions are designed for:
- Initial setup and migration
- Bucket creation automation
- Policy setup assistance
- Development environment setup

### Production Usage
For production environments:
- Replace with permanent bucket creation
- Implement proper backup strategies
- Set up monitoring and alerts
- Configure auto-scaling

## File Management

### Organization
- Logical folder structure
- Consistent naming conventions
- Version control support
- Cleanup policies

### Optimization
- Image compression
- Format conversion
- CDN integration
- Caching strategies

### Backup and Recovery
- Regular backup schedules
- Point-in-time recovery
- Cross-region replication
- Disaster recovery planning

## Performance Considerations

### Upload Performance
- Chunked upload support
- Progress tracking
- Resume capability
- Batch operations

### Access Performance
- CDN integration
- Caching strategies
- Query optimization
- Index management

### Storage Optimization
- Compression algorithms
- Deduplication
- Tiered storage
- Lifecycle policies
