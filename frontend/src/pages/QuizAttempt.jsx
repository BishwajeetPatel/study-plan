import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Clock, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react'
import api from '../services/api'

function QuizAttempt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchQuiz()
  }, [id])

  useEffect(() => {
    if (quiz && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [quiz, timeLeft])

  const fetchQuiz = async () => {
    try {
      const response = await api.get(`/quizzes/${id}`)
      setQuiz(response.data)
      setAnswers(new Array(response.data.questions.length).fill(null))
      setTimeLeft(response.data.timeLimit * 60)
    } catch (error) {
      setError('Failed to load quiz')
      console.error('Failed to fetch quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (optionIndex) => {
    const newAnswers = [...answers]
    newAnswers[currentQuestion] = optionIndex
    setAnswers(newAnswers)
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)

    try {
      const formattedAnswers = answers.map((answer, index) => ({
        questionIndex: index,
        selectedOption: answer !== null ? answer : -1
      }))

      const response = await api.post(`/quizzes/${id}/submit`, { answers: formattedAnswers })
      navigate(`/quizzes/${id}/results`, { state: { result: response.data } })
    } catch (error) {
      setError('Failed to submit quiz')
      console.error('Failed to submit quiz:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
        <Link to="/quizzes" className="text-primary-600 hover:text-primary-700">
          Back to Quizzes
        </Link>
      </div>
    )
  }

  if (!quiz) return null

  const question = quiz.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100
  const answeredCount = answers.filter(a => a !== null).length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link
            to="/quizzes"
            className="p-2 text-gray-400 hover:text-gray-600 mr-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-gray-500">{quiz.subject}</p>
          </div>
        </div>
        <div className={`flex items-center px-4 py-2 rounded-lg ${
          timeLeft < 60 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
        }`}>
          <Clock className="w-5 h-5 mr-2" />
          <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </span>
          <span className="text-sm text-gray-500">
            {answeredCount} answered
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-medium text-gray-900 mb-6">{question.question}</h2>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  answers[currentQuestion] === index
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-4 ${
                    answers[currentQuestion] === index
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-gray-300'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-gray-700">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="btn-secondary flex items-center disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </button>

          {currentQuestion < quiz.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion(Math.min(quiz.questions.length - 1, currentQuestion + 1))}
              className="btn-primary flex items-center"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to submit your answers?')) {
                  handleSubmit()
                }
              }}
              disabled={submitting}
              className="btn-primary flex items-center disabled:opacity-50"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Submit Quiz'
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-10 gap-2">
        {quiz.questions.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentQuestion(index)}
            className={`h-10 rounded-lg text-sm font-medium transition-colors ${
              index === currentQuestion
                ? 'bg-primary-600 text-white'
                : answers[index] !== null
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuizAttempt
