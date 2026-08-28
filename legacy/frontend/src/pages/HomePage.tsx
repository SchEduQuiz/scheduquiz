import { Link } from 'react-router-dom';
import { Brain, Calculator, BookText, Monitor, GraduationCap, Users, TrendingUp } from 'lucide-react';

const quizCategories = [
  { id: 'science', name: 'Science', icon: Brain, color: 'from-blue-500 to-blue-600', description: 'Physics, Chemistry, Biology' },
  { id: 'mathematics', name: 'Mathematics', icon: Calculator, color: 'from-purple-500 to-purple-600', description: 'Algebra, Geometry, Calculus' },
  { id: 'english', name: 'English', icon: BookText, color: 'from-green-500 to-green-600', description: 'Grammar, Literature, Vocabulary' },
  { id: 'computing', name: 'Computing', icon: Monitor, color: 'from-orange-500 to-orange-600', description: 'Programming, Networks, Security' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
              Welcome to EduQuiz Platform
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
              Challenge yourself with interactive quizzes and explore comprehensive courses taught by expert instructors
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
              <Link
                to="/courses"
                className="bg-white text-blue-600 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition text-center min-h-[48px] flex items-center justify-center"
              >
                Browse Courses
              </Link>
              <Link
                to="/register"
                className="bg-blue-800 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-blue-900 transition text-center min-h-[48px] flex items-center justify-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-slate-800">
            Quiz Challenge
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {quizCategories.map((category) => (
              <Link
                key={category.id}
                to={`/quiz/${category.id}`}
                className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 active:scale-95"
              >
                <div className={`bg-gradient-to-r ${category.color} p-5 sm:p-6 text-white`}>
                  <category.icon className="h-10 w-10 sm:h-12 sm:w-12 mb-3" />
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">{category.name}</h3>
                  <p className="text-sm opacity-90">{category.description}</p>
                </div>
                <div className="p-4">
                  <p className="text-sm text-slate-600">15 questions | 30s per question</p>
                  <p className="text-xs text-slate-500 mt-1">Test your knowledge now!</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-slate-800">
            Why Choose Our Platform?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center p-4">
              <div className="bg-blue-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-slate-800">Expert Instructors</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Learn from experienced teachers and industry professionals
              </p>
            </div>
            <div className="text-center p-4">
              <div className="bg-purple-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 sm:h-8 sm:w-8 text-purple-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-slate-800">Interactive Learning</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Engage with quizzes, lessons, and hands-on projects
              </p>
            </div>
            <div className="text-center p-4">
              <div className="bg-green-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-slate-800">Track Progress</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Monitor your learning journey and achievements
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
