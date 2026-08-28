# Quiz & Assessment Functions

## Overview
This directory contains quiz and assessment edge functions that handle quiz creation, taking, scoring, and gamification.

## Functions

### 1. ai-question-generator
**Purpose**: AI-powered question generation using Google AI
**Features**:
- Generate questions from lesson content
- Support for multiple question types (multiple choice, true/false, short answer)
- Difficulty levels (easy, medium, hard, mixed)
- Detailed explanations and references
- Fallback generation for API failures
- Customizable number of questions

**API Parameters**:
- `lesson_id` - Target lesson identifier
- `lesson_content` - Content to generate questions from
- `lesson_title` - Title for context
- `num_questions` - Number of questions to generate (default: 10)
- `difficulty` - Difficulty level (default: 'mixed')
- `question_types` - Types to include (default: ['multiple_choice', 'true_false'])

### 2. quiz-service
**Purpose**: Enhanced quiz service with advanced features
**Features**:
- Random question selection from quiz pools
- Time-based scoring with bonuses
- Hints system and penalty tracking
- Detailed explanations and feedback
- Performance tracking and statistics
- Multiple quiz modes (practice, challenge)

**API Endpoints**:
- `GET /list` - List available quizzes
- `GET /{quizId}` - Get quiz with questions
- `GET /{quizId}/start` - Start quiz session
- `GET /{quizId}/scores` - Get quiz scores
- `GET /{quizId}/hint/{questionId}` - Get question hint
- `POST /{quizId}/submit` - Submit quiz answers
- `POST /start` - Start quiz with JSON body

### 3. quiz-gamification-processor
**Purpose**: Advanced gamification and scoring system
**Features**:
- Sophisticated points calculation (base + time + streak bonuses)
- Achievement system (perfect score, speed demon, high achiever)
- User points and streak tracking
- Leaderboard management
- Quiz analytics and improvement tracking
- Comprehensive statistics

**Scoring System**:
- Base points from question difficulty
- Time bonus (up to 50% for quick answers)
- Streak bonus (10% per streak, max 50%)
- Difficulty multipliers (easy: 1x, medium: 1.5x, hard: 2x)

**Achievements**:
- `perfect_score` - 100% completion (50 points)
- `speed_demon` - Average < 10 seconds (30 points)
- `high_achiever` - Score >= 90% (20 points)

### 4. lesson-quiz-service
**Purpose**: Lesson-based quiz system
**Features**:
- Quiz creation from lesson content
- Quiz taking with time tracking
- Automatic grading and feedback
- Attempt limits and progress tracking
- Focus and tab-switch monitoring

**API Endpoints**:
- `GET /{quizId}` - Get lesson quiz
- `POST /{quizId}/submit` - Submit lesson quiz
- `GET /{quizId}/attempts` - Get user attempts
- `GET /questions/{id}/hint` - Get question hint
- `POST /generate` - Generate quiz from content

### 5. quiz-debug
**Purpose**: Debug functions for quiz system
**Features**:
- Quiz state inspection
- Question pool verification
- Score calculation debugging
- Performance monitoring

### 6. quiz-service-debug
**Purpose**: Debug functions for quiz service
**Features**:
- Service health checks
- Quiz pool analysis
- Scoring verification
- Performance metrics

## Quiz Features

### Question Types
- Multiple Choice (4 options)
- True/False
- Short Answer
- Essay (manual grading)

### Scoring
- Base points by difficulty
- Time-based bonuses
- Streak multipliers
- Hint penalties
- Perfect score bonuses

### Gamification
- User points system
- Achievement badges
- Daily streaks
- Leaderboards
- Level progression (1000 points = 1 level)

### Analytics
- Best scores tracking
- Average performance
- Improvement rates
- Time spent analysis
- Question difficulty analysis

## Security
- JWT token authentication
- Quiz attempt validation
- Hint usage tracking
- Anti-cheat measures (focus loss, tab switches)

## Performance
- Random question selection
- Efficient scoring algorithms
- Batch processing for analytics
- Real-time leaderboard updates
