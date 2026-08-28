import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../components/DashboardLayout';
import { Award, Star, Trophy, Medal, Crown, Zap } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_icon: string;
  criteria_type: string;
  criteria_value: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  achievements: Achievement;
}

export default function Achievements() {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [availableAchievements, setAvailableAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user's earned achievements
      const { data: earned } = await supabase
        .from('user_achievements')
        .select(`
          id,
          achievement_id,
          earned_at,
          achievements (
            id,
            name,
            description,
            badge_icon,
            criteria_type,
            criteria_value
          )
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      // Transform the data to match the interface
      const transformedEarned = (earned || []).map(item => ({
        id: item.id,
        achievement_id: item.achievement_id,
        earned_at: item.earned_at,
        achievements: Array.isArray(item.achievements) ? item.achievements[0] : item.achievements
      }));

      setUserAchievements(transformedEarned);

      // Load all achievements to show progress
      const { data: all } = await supabase
        .from('achievements')
        .select('*')
        .order('criteria_type');

      if (all) {
        const earnedIds = (earned || []).map(ua => ua.achievement_id);
        const unearned = all.filter(a => !earnedIds.includes(a.id));
        setAvailableAchievements(unearned);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  }

  function getBadgeIcon(iconName: string) {
    switch (iconName) {
      case 'trophy':
        return Trophy;
      case 'crown':
        return Crown;
      case 'star':
        return Star;
      case 'medal':
        return Medal;
      case 'zap':
        return Zap;
      default:
        return Award;
    }
  }

  function getAchievementProgress(achievement: Achievement) {
    // This would calculate actual progress based on user's data
    // For now, return a placeholder progress
    const progressMap: Record<string, number> = {
      'course_completion': 0,
      'assignment_score': 0,
      'streak': 0,
      'engagement': 0
    };
    return progressMap[achievement.criteria_type] || 0;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-8 px-6">
        <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Achievements</h1>
            <p className="text-slate-600">Track your learning milestones and earn badges</p>
          </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Earned Badges</p>
              <p className="text-3xl font-bold text-green-600">
                {userAchievements.length}
              </p>
            </div>
            <Award className="h-10 w-10 text-green-600 opacity-70" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Available Badges</p>
              <p className="text-3xl font-bold text-blue-600">
                {availableAchievements.length}
              </p>
            </div>
            <Star className="h-10 w-10 text-blue-600 opacity-70" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-purple-600">
                {Math.round((userAchievements.length / (userAchievements.length + availableAchievements.length)) * 100) || 0}%
              </p>
            </div>
            <Trophy className="h-10 w-10 text-purple-600 opacity-70" />
          </div>
        </div>
      </div>

      {/* Earned Achievements */}
      {userAchievements.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Your Badges</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userAchievements.map((userAchievement) => {
              const IconComponent = getBadgeIcon(userAchievement.achievements.badge_icon);
              return (
                <div
                  key={userAchievement.id}
                  className="bg-white rounded-xl shadow-sm p-6 border border-green-200 hover:shadow-md transition"
                >
                  <div className="text-center">
                    <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 mb-2">
                      {userAchievement.achievements.name}
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      {userAchievement.achievements.description}
                    </p>
                    <div className="text-xs text-green-600 font-medium">
                      Earned {new Date(userAchievement.earned_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Achievements */}
      {availableAchievements.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Available Badges</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableAchievements.map((achievement) => {
              const IconComponent = getBadgeIcon(achievement.badge_icon);
              const progress = getAchievementProgress(achievement);
              const progressPercentage = Math.min((progress / achievement.criteria_value) * 100, 100);

              return (
                <div
                  key={achievement.id}
                  className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:border-slate-300 transition"
                >
                  <div className="text-center">
                    <div className="bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 mb-2">
                      {achievement.name}
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      {achievement.description}
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Progress</span>
                        <span>{progress} / {achievement.criteria_value}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 capitalize">
                      {achievement.criteria_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {userAchievements.length === 0 && availableAchievements.length === 0 && (
        <div className="text-center py-12">
          <Award className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Achievements Yet</h3>
          <p className="text-slate-600">
            Start learning to unlock your first badge!
          </p>
        </div>
      )}
    </div>
    </div>
    </DashboardLayout>
  );
}
