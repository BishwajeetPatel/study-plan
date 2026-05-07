import { useState, useEffect } from 'react'
import { BookOpen, ClipboardList, Target, TrendingUp, Clock, Award, Calendar, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function Dashboard() {
  const [stats, setStats] = useState({
    studyPlans: { totalPlans: 0, activePlans: 0, completedPlans: 0, averageProgress: 0 },
    quizzes: { totalQuizzes: 0, aiGeneratedQuizzes: 0, totalAttempts: 0, averageScore: 0 }
  })
  const [recentPlans, setRecentPlans] = useState([])
  const [recentQuizzes, setRecentQuizzes] = useState([])
  const [upcomingExams, setUpcomingExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [plansRes, quizzesRes, plansList, quizzesList, examsRes] = await Promise.all([
        api.get('/study-plans/stats/overview'),
        api.get('/quizzes/stats/overview'),
        api.get('/study-plans'),
        api.get('/quizzes'),
        api.get('/calendar/upcoming')
      ])

      setStats({
        studyPlans: plansRes.data,
        quizzes: quizzesRes.data
      })
      setRecentPlans(plansList.data.slice(0, 5))
      setRecentQuizzes(quizzesList.data.slice(0, 5))
      setUpcomingExams(examsRes.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Track your learning progress and achievements</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-primary-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Study Plans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.studyPlans.activePlans}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-secondary-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-secondary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.quizzes.totalQuizzes}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.quizzes.averageScore}%</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.studyPlans.averageProgress}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Exams */}
      <div className="mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Upcoming Exams</h2>
            <Link to="/calendar" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View Calendar
            </Link>
          </div>
          {upcomingExams.length > 0 ? (
            <div className="space-y-3">
              {upcomingExams.slice(0, 3).map((exam) => (
                <div key={exam._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      exam.importance === 'critical' ? 'bg-red-500' :
                      exam.importance === 'high' ? 'bg-orange-500' :
                      exam.importance === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{exam.title}</p>
                      <p className="text-sm text-gray-600">{exam.subject} • {exam.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-600">
                      {exam.countdown.days > 0 ? `${exam.countdown.days}d ${exam.countdown.hours}h` : `${exam.countdown.hours}h`}
                    </p>
                    <p className="text-xs text-gray-500">until exam</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No upcoming exams scheduled</p>
              <Link to="/calendar" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
                Add Exam Dates
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Study Plans */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Study Plans</h2>
            <Link to="/study-plans" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All
            </Link>
          </div>

          {recentPlans.length > 0 ? (
            <div className="space-y-4">
              {recentPlans.map((plan) => (
                <div key={plan._id} className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{plan.title}</h3>
                    <p className="text-sm text-gray-500">{plan.subject}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      plan.status === 'active' ? 'bg-green-100 text-green-700' :
                      plan.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {plan.status}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">{plan.progress}% complete</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No study plans yet</p>
              <Link to="/study-plans" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
                Create your first plan
              </Link>
            </div>
          )}
        </div>

        {/* Recent Quizzes */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Quizzes</h2>
            <Link to="/quizzes" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All
            </Link>
          </div>

          {recentQuizzes.length > 0 ? (
            <div className="space-y-4">
              {recentQuizzes.map((quiz) => (
                <div key={quiz._id} className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{quiz.title}</h3>
                    <p className="text-sm text-gray-500">{quiz.subject} - {quiz.difficulty}</p>
                  </div>
                  <div className="text-right">
                    {quiz.isAIGenerated && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium mr-2">
                        AI
                      </span>
                    )}
                    <span className="text-sm text-gray-500">{quiz.questions?.length || 0} questions</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No quizzes yet</p>
              <Link to="/ai-quiz-generator" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
                Generate AI quiz
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/study-plans" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Clock className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">Create Study Plan</h3>
              <p className="text-sm text-gray-500">Organize your learning goals</p>
            </div>
          </div>
        </Link>

        <Link to="/ai-quiz-generator" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-secondary-100 rounded-lg">
              <Award className="w-6 h-6 text-secondary-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">AI Quiz Generator</h3>
              <p className="text-sm text-gray-500">Test knowledge with AI quizzes</p>
            </div>
          </div>
        </Link>

        <Link to="/quizzes" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">Take a Quiz</h3>
              <p className="text-sm text-gray-500">Practice and improve</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default Dashboard
