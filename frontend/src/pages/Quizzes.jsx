import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Play, Trash2, Sparkles, ClipboardList, Clock, Award } from 'lucide-react'
import api from '../services/api'

function Quizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuizzes()
  }, [])

  const fetchQuizzes = async () => {
    try {
      const response = await api.get('/quizzes')
      setQuizzes(response.data)
    } catch (error) {
      console.error('Failed to fetch quizzes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return
    try {
      await api.delete(`/quizzes/${id}`)
      fetchQuizzes()
    } catch (error) {
      console.error('Failed to delete quiz:', error)
    }
  }

  const getBestAttempt = (attempts) => {
    if (!attempts || attempts.length === 0) return null
    return attempts.reduce((best, current) => current.percentage > best.percentage ? current : best)
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-gray-600 mt-1">Test your knowledge with quizzes</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/ai-quiz-generator"
            className="btn-primary flex items-center bg-gradient-to-r from-secondary-600 to-secondary-700"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            AI Generator
          </Link>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-16 card">
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes yet</h3>
          <p className="text-gray-500 mb-4">Generate AI-powered quizzes or create your own</p>
          <Link
            to="/ai-quiz-generator"
            className="btn-primary inline-flex items-center"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Generate AI Quiz
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const bestAttempt = getBestAttempt(quiz.attempts)
            return (
              <div key={quiz._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {quiz.isAIGenerated && (
                      <div className="p-2 bg-purple-100 rounded-lg mr-3">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900">{quiz.title}</h3>
                      <p className="text-sm text-gray-500">{quiz.subject}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(quiz._id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {quiz.topic && (
                  <p className="text-sm text-gray-600 mb-3">Topic: {quiz.topic}</p>
                )}

                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center">
                    <ClipboardList className="w-4 h-4 mr-1" />
                    {quiz.questions?.length || 0} questions
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {quiz.timeLimit} min
                  </span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {quiz.difficulty}
                  </span>
                  {quiz.isAIGenerated && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                      AI Generated
                    </span>
                  )}
                </div>

                {bestAttempt && (
                  <div className="flex items-center p-3 bg-green-50 rounded-lg mb-4">
                    <Award className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Best Score: {bestAttempt.percentage}%
                      </p>
                      <p className="text-xs text-green-600">
                        {bestAttempt.score}/{bestAttempt.totalQuestions} correct
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Link
                    to={`/quizzes/${quiz._id}`}
                    className="flex-1 btn-primary flex items-center justify-center"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Quiz
                  </Link>
                  {quiz.attempts?.length > 0 && (
                    <Link
                      to={`/quizzes/${quiz._id}/results`}
                      className="btn-secondary"
                    >
                      History
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Quizzes
