import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import api from '../services/api'

function AIQuizGenerator() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    difficulty: 'medium',
    numQuestions: 5
  })
  const [loading, setLoading] = useState(false)
  const [generatedQuiz, setGeneratedQuiz] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setGeneratedQuiz(null)

    try {
      const response = await api.post('/ai/generate-quiz', formData)
      setGeneratedQuiz(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate quiz. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartQuiz = () => {
    if (generatedQuiz) {
      navigate(`/quizzes/${generatedQuiz._id}`)
    }
  }

  return (
    <div>
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate('/quizzes')}
          className="p-2 text-gray-400 hover:text-gray-600 mr-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Quiz Generator</h1>
          <p className="text-gray-600 mt-1">Generate custom quizzes powered by Google Gemini AI</p>
        </div>
      </div>

      {generatedQuiz ? (
        <div className="card max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Generated Successfully!</h2>
            <p className="text-gray-600">Your AI-powered quiz is ready to take</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">{generatedQuiz.title}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Subject:</span>
                <span className="ml-2 font-medium">{generatedQuiz.subject}</span>
              </div>
              <div>
                <span className="text-gray-500">Topic:</span>
                <span className="ml-2 font-medium">{generatedQuiz.topic || 'General'}</span>
              </div>
              <div>
                <span className="text-gray-500">Questions:</span>
                <span className="ml-2 font-medium">{generatedQuiz.questions?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Difficulty:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  generatedQuiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  generatedQuiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {generatedQuiz.difficulty}
                </span>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleStartQuiz}
              className="flex-1 btn-primary py-3 flex items-center justify-center"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Quiz Now
            </button>
            <button
              onClick={() => {
                setGeneratedQuiz(null)
                setFormData({ subject: '', topic: '', difficulty: 'medium', numQuestions: 5 })
              }}
              className="btn-secondary"
            >
              Generate Another
            </button>
          </div>
        </div>
      ) : (
        <div className="card max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label">Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="input"
                placeholder="e.g., Mathematics, History, Science"
                required
              />
            </div>

            <div>
              <label className="label">Topic *</label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="input"
                placeholder="e.g., Algebra, World War II, Photosynthesis"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="input"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="label">Number of Questions</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.numQuestions}
                  onChange={(e) => setFormData({ ...formData, numQuestions: parseInt(e.target.value) })}
                  className="input"
                  required
                />
              </div>
            </div>

            <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
              <div className="flex items-start">
                <Sparkles className="w-5 h-5 text-primary-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-primary-900 mb-1">AI-Powered Generation</h4>
                  <p className="text-sm text-primary-700">
                    Our AI will generate high-quality multiple-choice questions based on your subject and topic. 
                    Each question will include 4 options with one correct answer and an explanation.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Quiz
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default AIQuizGenerator
