import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import StudyPlans from './pages/StudyPlans'
import Quizzes from './pages/Quizzes'
import QuizAttempt from './pages/QuizAttempt'
import QuizResults from './pages/QuizResults'
import AIQuizGenerator from './pages/AIQuizGenerator'
import MindGames from './pages/MindGames'
import Calendar from './pages/Calendar'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const handleLogin = (data) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
      } />
      <Route path="/register" element={
        user ? <Navigate to="/" /> : <Register onLogin={handleLogin} />
      } />
      <Route path="/" element={
        user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
      }>
        <Route index element={<Dashboard />} />
        <Route path="study-plans" element={<StudyPlans />} />
        <Route path="quizzes" element={<Quizzes />} />
        <Route path="quizzes/:id" element={<QuizAttempt />} />
        <Route path="quizzes/:id/results" element={<QuizResults />} />
        <Route path="ai-quiz-generator" element={<AIQuizGenerator />} />
        <Route path="mind-games" element={<MindGames />} />
        <Route path="calendar" element={<Calendar />} />
      </Route>
    </Routes>
  )
}

export default App
