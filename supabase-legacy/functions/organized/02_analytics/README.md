# Analytics & Reporting Functions

## Overview
This directory contains analytics and reporting edge functions that provide insights into platform usage, student performance, and system metrics.

## Functions

### 1. analytics-engine
**Purpose**: Comprehensive analytics engine for students, teachers, and admins
**Features**:
- Student dashboard analytics (enrolled courses, completed lessons, average grades, study streaks)
- Course analytics for teachers (enrollments, active students, completion rates)
- Teacher overview analytics (total courses, students, pending grades)
- Admin overview analytics (users by role, courses, enrollments, recent activity)
- Real-time data aggregation and calculations

**API Endpoints**:
- `student_dashboard` - Student analytics and progress
- `course_analytics` - Course-specific analytics for teachers
- `teacher_overview` - Teacher dashboard overview
- `admin_overview` - Admin platform overview

### 2. admin-analytics (moved from Admin functions)
**Purpose**: Advanced platform analytics for administrators
**Features**:
- Platform overview with user, question, and activity statistics
- Detailed analytics with performance metrics
- Trend analysis with historical data
- System health monitoring and checks
- Date range filtering (today, week, month, year)

**API Endpoints**:
- `get_overview_analytics` - Platform overview statistics
- `get_detailed_analytics` - Detailed platform metrics
- `get_performance_metrics` - System performance data
- `get_trend_analysis` - Historical trend analysis
- `get_system_health` - System health status

## Analytics Features

### Student Analytics
- Enrolled courses count
- Completed lessons tracking
- Average grade calculations
- Study streak tracking
- Recent activity monitoring (last 30 days)

### Course Analytics
- Total student enrollments
- Active students (7-day activity)
- Assignment completion rates
- Progress tracking data

### Teacher Analytics
- Total courses taught
- Total students across courses
- Pending submissions to grade
- Course performance metrics

### Platform Analytics
- User distribution by role
- Question statistics by type
- Activity patterns and trends
- System health monitoring

## Data Processing
- Real-time calculations from database
- Parallel queries for performance
- Date range filtering and aggregation
- Statistical analysis and trend detection

## Security
- Role-based access control
- Admin verification for platform analytics
- Teacher verification for course analytics
- Student verification for personal analytics

## Performance
- Parallel data fetching
- Efficient aggregation queries
- Caching-friendly data structures
- Batch processing for large datasets
