import { useState, useEffect } from 'react'
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Award, TrendingUp, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import api from '../services/api'

function QuizResults() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const result = location.state?.result

  useEffect(() => {
    fetchQuiz()
  }, [id])

  const fetchQuiz = async () => {
    try {
      const response = await api.get(`/quizzes/${id}/review`)
      setQuiz(response.data)
    } catch (error) {
      console.error('Failed to fetch quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRetake = () => {
    navigate(`/quizzes/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quiz not found</h3>
        <Link to="/quizzes" className="text-primary-600 hover:text-primary-700">
          Back to Quizzes
        </Link>
      </div>
    )
  }

  // If we have a fresh result from submission, show it; otherwise show the last attempt
  const displayResult = result || (quiz.attempts?.length > 0 ? {
    score: quiz.attempts[quiz.attempts.length - 1].score,
    totalQuestions: quiz.attempts[quiz.attempts.length - 1].totalQuestions,
    percentage: quiz.attempts[quiz.attempts.length - 1].percentage,
    answers: quiz.attempts[quiz.attempts.length - 1].answers
  } : null)

  if (!displayResult) {
    return (
      <div className="text-center py-16 card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">You haven't taken this quiz yet</h3>
        <button onClick={handleRetake} className="btn-primary">
          Start Quiz
        </button>
      </div>
    )
  }

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (percentage) => {
    if (percentage >= 80) return 'bg-green-50 border-green-200'
    if (percentage >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <Link
          to="/quizzes"
          className="p-2 text-gray-400 hover:text-gray-600 mr-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quiz Results</h1>
          <p className="text-gray-600">{quiz.title}</p>
        </div>
      </div>

      {/* Score Summary */}
      <div className={`card mb-6 border-2 ${getScoreBg(displayResult.percentage)}`}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-sm">
            <Award className={`w-10 h-10 ${getScoreColor(displayResult.percentage)}`} />
          </div>
          <h2 className={`text-4xl font-bold ${getScoreColor(displayResult.percentage)} mb-2`}>
            {displayResult.percentage}%
          </h2>
          <p className="text-gray-600 mb-4">
            You got {displayResult.score} out of {displayResult.totalQuestions} questions correct
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm">
            <span className="flex items-center text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              {displayResult.score} Correct
            </span>
            <span className="flex items-center text-red-600">
              <XCircle className="w-4 h-4 mr-1" />
              {displayResult.totalQuestions - displayResult.score} Incorrect
            </span>
          </div>
        </div>
      </div>

      {/* Attempt History */}
      {quiz.attempts && quiz.attempts.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-bold text-gray-900">Attempt History</h3>
          </div>
          <div className="space-y-3">
            {[...quiz.attempts].reverse().map((attempt, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600 mr-4">
                    Attempt {quiz.attempts.length - index}
                  </span>
                  <span className={`font-bold ${getScoreColor(attempt.percentage)}`}>
                    {attempt.percentage}%
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(new Date(attempt.completedAt), 'MMM d, h:mm a')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Review */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Question Review</h3>
        <div className="space-y-6">
          {quiz.questions.map((question, index) => {
            const userAnswer = displayResult.answers?.find(a => a.questionIndex === index)
            const isCorrect = userAnswer?.isCorrect
            const correctAnswerIndex = question.correctAnswer

            return (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-start mb-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                    isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{question.question}</p>
                  </div>
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 ml-2" />
                  )}
                </div>

                <div className="ml-11 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`p-2 rounded text-sm ${
                        optionIndex === correctAnswerIndex
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : optionIndex === userAnswer?.selectedOption && !isCorrect
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + optionIndex)}.</span>
                      {option}
                      {optionIndex === correctAnswerIndex && (
                        <span className="ml-2 text-xs font-medium text-green-600">(Correct)</span>
                      )}
                    </div>
                  ))}
                </div>

                {question.explanation && (
                  <div className="ml-11 mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Explanation:</span> {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleRetake}
          className="flex-1 btn-primary flex items-center justify-center"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Retake Quiz
        </button>
        <Link
          to="/quizzes"
          className="btn-secondary"
        >
          Back to Quizzes
        </Link>
      </div>
    </div>
  )
}

export default QuizResults
