import { useState, useEffect } from 'react'
import { Calculator, Brain, Trophy, Timer, ChevronRight, Star, Zap, Target, Lightbulb, Hash } from 'lucide-react'

// Generate a single BODMAS question (fast, no eval)
function generateOneBODMASQuestion() {
  const types = ['simple', 'md', 'mixed', 'parens']
  const type = types[Math.floor(Math.random() * types.length)]
  let display, answer

  const a = Math.floor(Math.random() * 20) + 1
  const b = Math.floor(Math.random() * 20) + 1
  const c = Math.floor(Math.random() * 10) + 1
  const d = Math.floor(Math.random() * 10) + 1

  switch (type) {
    case 'simple':
      const op1 = Math.random() > 0.5 ? '+' : '-'
      display = `${a} ${op1} ${b}`
      answer = op1 === '+' ? a + b : a - b
      break
    case 'md':
      const op2 = Math.random() > 0.5 ? '*' : '/'
      const m = c * d
      display = op2 === '*' ? `${c} × ${d}` : `${m} ÷ ${d}`
      answer = op2 === '*' ? c * d : c // m/d = c
      break
    case 'mixed': {
      // BODMAS: multiplication first
      const opA = Math.random() > 0.5 ? '+' : '-'
      const opB = Math.random() > 0.5 ? '+' : '-'
      const useMul = Math.random() > 0.5
      if (useMul) {
        display = `${a} ${opA} ${b} × ${c}`
        const prod = b * c
        answer = opA === '+' ? a + prod : a - prod
      } else {
        display = `${a} ${opA} ${b} ${opB} ${c}`
        answer = opA === '+' ? (opB === '+' ? a + b + c : a + b - c) : (opB === '+' ? a - b + c : a - b - c)
      }
      break
    }
    case 'parens': {
      const po1 = Math.random() > 0.3 ? '+' : '-'
      const po2 = Math.random() > 0.5 ? '+' : '-'
      const useMulIn = Math.random() > 0.5
      if (useMulIn) {
        display = `(${a} × ${b}) ${po2} ${c}`
        const prod = a * b
        answer = po2 === '+' ? prod + c : prod - c
      } else {
        display = `(${a} ${po1} ${b}) ${po2} ${c}`
        const inner = po1 === '+' ? a + b : a - b
        answer = po2 === '+' ? inner + c : inner - c
      }
      break
    }
  }

  // Generate 3 wrong options efficiently
  const options = [answer]
  const used = new Set([answer])
  for (let i = 1; i <= 3; i++) {
    let wrong = answer + (i * 3) + Math.floor(Math.random() * 5)
    if (used.has(wrong) || wrong < 0) wrong = Math.abs(answer - (i * 2))
    if (used.has(wrong)) wrong = answer + 10 + i * 7
    used.add(wrong)
    options.push(wrong)
  }

  return {
    expression: display,
    answer,
    options: options.sort(() => Math.random() - 0.5)
  }
}

// Generate 100 Quick Math questions
function generateQuickMathQuestions(count = 100) {
  const questions = []
  for (let i = 0; i < count; i++) {
    const ops = ['+', '-', '*']
    const op = ops[Math.floor(Math.random() * 3)]
    let a, b, answer

    if (op === '*') {
      a = Math.floor(Math.random() * 12) + 2
      b = Math.floor(Math.random() * 12) + 2
    } else {
      a = Math.floor(Math.random() * 50) + 10
      b = Math.floor(Math.random() * 50) + 1
    }

    if (op === '-' && a < b) [a, b] = [b, a]

    answer = op === '+' ? a + b : op === '-' ? a - b : a * b

    questions.push({
      text: `${a} ${op === '*' ? '×' : op} ${b}`,
      answer
    })
  }
  return questions
}

// BODMAS Game - 100 questions, 60 sec fixed
function BODMASGAME({ onScore }) {
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [gameActive, setGameActive] = useState(false)
  const [selected, setSelected] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timer)
    } else if (gameActive && timeLeft === 0) {
      endGame()
    }
  }, [gameActive, timeLeft])

  const endGame = () => {
    setGameActive(false)
    onScore(score)
  }

  const handleAnswer = (option) => {
    if (selected !== null) return

    const correct = option === questions[currentQ].answer
    setSelected(option)
    setIsCorrect(correct)

    if (correct) {
      setScore(s => s + 10)
    }

    setTimeout(() => {
      if (currentQ < 99) {
        setCurrentQ(c => c + 1)
        setSelected(null)
        setIsCorrect(null)
      } else {
        endGame()
      }
    }, 500)
  }

  const startGame = async () => {
    setLoading(true)
    // Generate questions in next tick to not block UI
    await new Promise(resolve => setTimeout(resolve, 10))
    const qs = []
    for (let i = 0; i < 100; i++) {
      qs.push(generateOneBODMASQuestion())
    }
    setQuestions(qs)
    setCurrentQ(0)
    setScore(0)
    setTimeLeft(60)
    setSelected(null)
    setIsCorrect(null)
    setGameActive(true)
    setLoading(false)
  }

  const q = questions[currentQ] || generateOneBODMASQuestion()

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading questions...</p>
      </div>
    )
  }

  if (!gameActive) {
    return (
      <div className="text-center py-8">
        <Calculator className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">BODMAS Challenge</h3>
        <p className="text-gray-600 mb-4">100 questions • 60 seconds • Order of operations</p>
        <div className="mb-6">
          <div className="text-3xl font-bold text-blue-600">{score}</div>
          <div className="text-sm text-gray-500">Last Score</div>
        </div>
        <button onClick={startGame} className="btn-primary text-lg px-8">
          {score > 0 ? 'Play Again' : 'Start Game'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-medium text-gray-600">
          Q{currentQ + 1}/100
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-bold text-blue-600">Score: {score}</span>
          <span className={`text-sm font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-orange-600'}`}>
            <Timer className="w-4 h-4 inline mr-1" />
            {timeLeft}s
          </span>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-8 mb-6 text-center">
        <div className="text-4xl font-bold text-gray-900">{q.expression} = ?</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {q.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(opt)}
            disabled={selected !== null}
            className={`p-4 rounded-xl text-xl font-bold transition-all ${
              selected === opt
                ? isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                : selected !== null && opt === q.answer
                  ? 'bg-green-500 text-white'
                  : 'bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// Quick Math Game - 100 questions, 60 sec fixed
function QuickMathGame({ onScore }) {
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [gameActive, setGameActive] = useState(false)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timer)
    } else if (gameActive && timeLeft === 0) {
      endGame()
    }
  }, [gameActive, timeLeft])

  const endGame = () => {
    setGameActive(false)
    onScore(score)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!answer) return

    const num = parseInt(answer)
    if (num === questions[currentQ].answer) {
      const newStreak = streak + 1
      setStreak(newStreak)
      setScore(s => s + 10 + (newStreak > 3 ? newStreak : 0))
      setStreak(newStreak)
    } else {
      setStreak(0)
    }

    setAnswer('')
    if (currentQ < 99) {
      setCurrentQ(c => c + 1)
    } else {
      endGame()
    }
  }

  const startGame = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 10))
    setQuestions(generateQuickMathQuestions(100))
    setCurrentQ(0)
    setScore(0)
    setStreak(0)
    setTimeLeft(60)
    setAnswer('')
    setGameActive(true)
    setLoading(false)
  }

  const q = questions[currentQ] || generateQuickMathQuestions(1)[0]

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading questions...</p>
      </div>
    )
  }

  if (!gameActive) {
    return (
      <div className="text-center py-8">
        <Zap className="w-16 h-16 text-orange-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Quick Math</h3>
        <p className="text-gray-600 mb-4">100 questions • 60 seconds • Fast arithmetic</p>
        <div className="mb-6">
          <div className="text-3xl font-bold text-orange-600">{score}</div>
          <div className="text-sm text-gray-500">Last Score</div>
        </div>
        <button onClick={startGame} className="btn-primary text-lg px-8">
          {score > 0 ? 'Play Again' : 'Start Game'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-medium text-gray-600">
          Q{currentQ + 1}/100
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-bold text-orange-600">Score: {score}</span>
          {streak > 2 && <span className="text-sm font-bold text-red-600">🔥 {streak}</span>}
          <span className={`text-sm font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-orange-600'}`}>
            <Timer className="w-4 h-4 inline mr-1" />
            {timeLeft}s
          </span>
        </div>
      </div>

      <div className="bg-orange-50 rounded-xl p-8 mb-6 text-center">
        <div className="text-5xl font-bold text-gray-900">{q.text} = ?</div>
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="input text-center text-2xl font-bold mb-4"
          placeholder="?"
          autoFocus
        />
        <button type="submit" className="btn-primary w-full text-lg">
          Submit (Enter)
        </button>
      </form>
    </div>
  )
}

// Number Guessing Game - Higher or Lower
function NumberGuessGame({ onScore }) {
  const [target, setTarget] = useState(0)
  const [guess, setGuess] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [gameActive, setGameActive] = useState(false)
  const [score, setScore] = useState(0)

  const startGame = () => {
    setTarget(Math.floor(Math.random() * 100) + 1)
    setGuess('')
    setAttempts(0)
    setFeedback('Guess a number between 1 and 100!')
    setGameActive(true)
    setScore(1000)
  }

  const handleGuess = (e) => {
    e.preventDefault()
    const num = parseInt(guess)
    if (!num || num < 1 || num > 100) return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    if (num === target) {
      const finalScore = Math.max(100, 1000 - (newAttempts * 50))
      setScore(finalScore)
      setFeedback(`🎉 Correct! You found it in ${newAttempts} attempts!`)
      setGameActive(false)
      onScore(finalScore)
    } else if (num < target) {
      setFeedback('📈 Too low! Try higher')
    } else {
      setFeedback('📉 Too high! Try lower')
    }
    setGuess('')
  }

  if (!gameActive) {
    return (
      <div className="text-center py-8">
        <Lightbulb className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Number Guess</h3>
        <p className="text-gray-600 mb-4">I'm thinking of a number 1-100. Can you find it?</p>
        {score > 0 && score < 1000 && (
          <div className="mb-4">
            <div className="text-3xl font-bold text-yellow-600">{score}</div>
            <div className="text-sm text-gray-500">Last Score</div>
          </div>
        )}
        <button onClick={startGame} className="btn-primary text-lg px-8">
          {score > 0 ? 'Play Again' : 'Start Game'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-yellow-600">Attempts: {attempts}</span>
      </div>

      <div className="bg-yellow-50 rounded-xl p-6 mb-6 text-center">
        <p className="text-lg text-gray-700 mb-2">{feedback}</p>
        <p className="text-sm text-gray-500">Enter a number between 1-100</p>
      </div>

      <form onSubmit={handleGuess}>
        <input
          type="number"
          min="1"
          max="100"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          className="input text-center text-3xl font-bold mb-4"
          placeholder="?"
          autoFocus
        />
        <button type="submit" className="btn-primary w-full text-lg">
          Make Guess
        </button>
      </form>
    </div>
  )
}

// Math True/False Quiz - 100 questions, 60 sec
function generateTrueFalseQuestions(count = 100) {
  const questions = []
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * 20) + 1
    const b = Math.floor(Math.random() * 20) + 1
    const ops = ['+', '-', '*']
    const op = ops[Math.floor(Math.random() * 3)]

    let correctAnswer, display
    const isTrue = Math.random() > 0.5

    if (op === '+') {
      correctAnswer = a + b
      display = `${a} + ${b} = ${isTrue ? correctAnswer : correctAnswer + Math.floor(Math.random() * 5) + 1}`
    } else if (op === '-') {
      correctAnswer = a - b
      display = `${a} - ${b} = ${isTrue ? correctAnswer : correctAnswer + Math.floor(Math.random() * 5) + 1}`
    } else {
      correctAnswer = a * b
      display = `${a} × ${b} = ${isTrue ? correctAnswer : correctAnswer + Math.floor(Math.random() * 5) + 1}`
    }

    questions.push({
      text: display,
      answer: isTrue
    })
  }
  return questions
}

function TrueFalseGame({ onScore }) {
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [gameActive, setGameActive] = useState(false)
  const [selected, setSelected] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timer)
    } else if (gameActive && timeLeft === 0) {
      endGame()
    }
  }, [gameActive, timeLeft])

  const endGame = () => {
    setGameActive(false)
    onScore(score)
  }

  const handleAnswer = (answer) => {
    if (selected !== null) return

    const correct = answer === questions[currentQ].answer
    setSelected(answer)
    setIsCorrect(correct)

    if (correct) setScore(s => s + 10)

    setTimeout(() => {
      if (currentQ < 99) {
        setCurrentQ(c => c + 1)
        setSelected(null)
        setIsCorrect(null)
      } else {
        endGame()
      }
    }, 400)
  }

  const startGame = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 10))
    setQuestions(generateTrueFalseQuestions(100))
    setCurrentQ(0)
    setScore(0)
    setTimeLeft(60)
    setSelected(null)
    setIsCorrect(null)
    setGameActive(true)
    setLoading(false)
  }

  const q = questions[currentQ] || generateTrueFalseQuestions(1)[0]

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading questions...</p>
      </div>
    )
  }

  if (!gameActive) {
    return (
      <div className="text-center py-8">
        <Brain className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">True or False</h3>
        <p className="text-gray-600 mb-4">100 questions • 60 seconds • Is the math correct?</p>
        <div className="mb-6">
          <div className="text-3xl font-bold text-purple-600">{score}</div>
          <div className="text-sm text-gray-500">Last Score</div>
        </div>
        <button onClick={startGame} className="btn-primary text-lg px-8">
          {score > 0 ? 'Play Again' : 'Start Game'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-medium text-gray-600">Q{currentQ + 1}/100</div>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-bold text-purple-600">Score: {score}</span>
          <span className={`text-sm font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-orange-600'}`}>
            <Timer className="w-4 h-4 inline mr-1" />
            {timeLeft}s
          </span>
        </div>
      </div>

      <div className="bg-purple-50 rounded-xl p-8 mb-6 text-center">
        <div className="text-4xl font-bold text-gray-900">{q.text}</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleAnswer(true)}
          disabled={selected !== null}
          className={`p-6 rounded-xl text-2xl font-bold transition-all ${
            selected === true
              ? isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              : selected !== null && q.answer === true
                ? 'bg-green-500 text-white'
                : 'bg-green-100 border-2 border-green-300 hover:bg-green-200 text-green-800'
          }`}
        >
          ✓ TRUE
        </button>
        <button
          onClick={() => handleAnswer(false)}
          disabled={selected !== null}
          className={`p-6 rounded-xl text-2xl font-bold transition-all ${
            selected === false
              ? isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              : selected !== null && q.answer === false
                ? 'bg-green-500 text-white'
                : 'bg-red-100 border-2 border-red-300 hover:bg-red-200 text-red-800'
          }`}
        >
          ✗ FALSE
        </button>
      </div>
    </div>
  )
}

// Main Mind Games Component
function MindGames() {
  const [activeGame, setActiveGame] = useState('menu')
  const [totalScore, setTotalScore] = useState(() => {
    return parseInt(localStorage.getItem('mindGamesScore') || '0')
  })

  const handleScore = (points) => {
    const newTotal = totalScore + points
    setTotalScore(newTotal)
    localStorage.setItem('mindGamesScore', newTotal.toString())
  }

  const games = [
    {
      id: 'bodmas',
      name: 'BODMAS Challenge',
      description: '100 questions • 60 sec • Order of operations',
      icon: Calculator,
      color: 'bg-blue-500',
      component: BODMASGAME
    },
    {
      id: 'quickmath',
      name: 'Quick Math',
      description: '100 questions • 60 sec • Fast arithmetic',
      icon: Zap,
      color: 'bg-orange-500',
      component: QuickMathGame
    },
    {
      id: 'numberguess',
      name: 'Number Guess',
      description: 'Find the hidden number 1-100',
      icon: Lightbulb,
      color: 'bg-yellow-500',
      component: NumberGuessGame
    },
    {
      id: 'truefalse',
      name: 'True or False',
      description: '100 questions • 60 sec • Is it correct?',
      icon: Brain,
      color: 'bg-purple-500',
      component: TrueFalseGame
    }
  ]

  const ActiveComponent = games.find(g => g.id === activeGame)?.component

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mind Games</h1>
        <p className="text-gray-600">Train your brain with fun challenges</p>
      </div>

      {activeGame === 'menu' ? (
        <>
          {/* Stats Card */}
          <div className="card mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Total Score</p>
                  <p className="text-3xl font-bold text-gray-900">{totalScore.toLocaleString()}</p>
                </div>
              </div>
              <Trophy className="w-12 h-12 text-yellow-500" />
            </div>
          </div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => setActiveGame(game.id)}
                className="card text-left hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start">
                  <div className={`w-14 h-14 ${game.color} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <game.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{game.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{game.description}</p>
                    <div className="flex items-center text-primary-600 text-sm font-medium">
                      Play Now
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setActiveGame('menu')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronRight className="w-5 h-5 rotate-180 mr-1" />
              Back to Games
            </button>
            <div className="flex items-center">
              <Star className="w-5 h-5 text-yellow-500 mr-1" />
              <span className="font-bold text-gray-900">{totalScore.toLocaleString()}</span>
            </div>
          </div>
          
          <ActiveComponent onScore={handleScore} />
        </div>
      )}
    </div>
  )
}

export default MindGames