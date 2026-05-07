import { useState, useEffect } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Calendar,
  Target,
  Sparkles,
  Clock,
  Sun,
  Moon,
  BookOpen,
  Coffee,
  Upload,
  Printer
} from 'lucide-react'

import { format } from 'date-fns'
import api from '../services/api'

function StudyPlans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)

  const [showAIModal, setShowAIModal] = useState(false)

  const [showTimetable, setShowTimetable] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  const [useCustomDescription, setUseCustomDescription] = useState(false)
  const [useSyllabusUpload, setUseSyllabusUpload] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)

  const [aiLoading, setAiLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    startDate: '',
    endDate: '',
    tasks: []
  })

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  })

  const [aiFormData, setAiFormData] = useState({
    goalType: 'short',
    subjects: [{ name: '', difficulty: 5, examDate: '' }],
    goal: '',
    customDescription: '',
    startDate: '',
    endDate: '',
    schedule: {
      wakeUpTime: '',
      schoolTime: '',
      tuitionTime: '',
      studyTime: '',
      sleepTime: '',
      notes: ''
    }
  })

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await api.get('/study-plans')
      setPlans(response.data)
    } catch (error) {
      console.error('Failed to fetch study plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingPlan) {
        await api.put(`/study-plans/${editingPlan._id}`, formData)
      } else {
        await api.post('/study-plans', formData)
      }

      setShowModal(false)
      setEditingPlan(null)

      setFormData({
        title: '',
        subject: '',
        description: '',
        startDate: '',
        endDate: '',
        tasks: []
      })

      fetchPlans()
    } catch (error) {
      console.error('Failed to save study plan:', error)
      alert('Failed to save study plan')
    }
  }

  const handleDelete = async (planId) => {
    try {
      await api.delete(`/study-plans/${planId}`)
      fetchPlans()
    } catch (error) {
      console.error('Failed to delete study plan:', error)
    }
  }

  const handleEdit = (plan) => {
    setEditingPlan(plan)

    setFormData({
      title: plan.title,
      subject: plan.subject,
      description: plan.description || '',
      startDate: plan.startDate?.split('T')[0] || '',
      endDate: plan.endDate?.split('T')[0] || '',
      tasks: plan.tasks || []
    })

    setShowModal(true)
  }

  const addTask = () => {
    if (!newTask.title) return

    setFormData({
      ...formData,
      tasks: [...formData.tasks, { ...newTask, completed: false }]
    })

    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: ''
    })
  }

  const removeTask = (index) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, i) => i !== index)
    })
  }

  const toggleTaskComplete = async (planId, taskIndex, completed) => {
    try {
      await api.patch(`/study-plans/${planId}/tasks/${taskIndex}`, {
        completed: !completed
      })

      fetchPlans()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const generateTimetable = (plan) => {
    if (!plan || !plan.tasks || plan.tasks.length === 0) return null

    const sessions = []

    const startDate = new Date(plan.startDate)
    const endDate = new Date(plan.endDate)

    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]

      const dayTasks = plan.tasks.filter((task) => {
        if (!task.dueDate) return false

        return (
          new Date(task.dueDate).toDateString() ===
          currentDate.toDateString()
        )
      })

      if (dayTasks.length > 0) {
        sessions.push({
          date: dateStr,
          dayName: currentDate.toLocaleDateString('en', {
            weekday: 'long'
          }),

          studySessions: dayTasks.map((task) => ({
            time: task.dueDate
              ? new Date(task.dueDate).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Flexible',

            topic: task.title,
            priority: task.priority
          }))
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return { sessions }
  }

  const generateQuizRecommendations = (plan) => {
    if (!plan || !plan.subjects) return []

    const recommendations = []

    const now = new Date()

    plan.subjects.forEach((subject) => {
      if (subject.examDate) {
        const examDate = new Date(subject.examDate)

        const daysUntilExam = Math.ceil(
          (examDate - now) / (1000 * 60 * 60 * 24)
        )

        if (daysUntilExam > 0 && daysUntilExam <= 30) {
          let quizType = 'Practice Test'
          let recommendedQuizDate = new Date(examDate.getTime() - (14 * 24 * 60 * 60 * 1000)) // 2 weeks before exam
          
          if (daysUntilExam <= 7) {
            quizType = 'Quick Review'
            recommendedQuizDate = new Date(examDate.getTime() - (3 * 24 * 60 * 60 * 1000)) // 3 days before exam
          } else if (daysUntilExam <= 14) {
            quizType = 'Mock Exam'
            recommendedQuizDate = new Date(examDate.getTime() - (7 * 24 * 60 * 60 * 1000)) // 1 week before exam
          }

          recommendations.push({
            subject: subject.name,
            examDate: subject.examDate,
            daysUntilExam,
            recommendedQuizDate,
            quizType,
            difficulty: subject.difficulty,
            topics: [
              'Key concepts for ' + subject.name,
              'Problem areas & weak points',
              'Exam preparation strategies',
              'Previous year questions',
              'Time management practice'
            ]
          })
        }
      }
    })

    return recommendations.sort((a, b) => a.daysUntilExam - b.daysUntilExam)
  }

  const handleAISubmit = async (e) => {
    e.preventDefault()
    setAiLoading(true)

    try {
      const payload = {
        goalType: aiFormData.goalType,
        schedule: aiFormData.schedule,
        startDate: aiFormData.startDate,
        endDate: aiFormData.endDate,
        goal: aiFormData.goal
      }

      if (useCustomDescription) {
        payload.customDescription = aiFormData.customDescription
      } else if (useSyllabusUpload) {
        // Handle file upload
        const formData = new FormData()
        formData.append('file', uploadedFile)
        formData.append('goalType', aiFormData.goalType)
        formData.append('schedule', JSON.stringify(aiFormData.schedule))
        formData.append('startDate', aiFormData.startDate)
        formData.append('endDate', aiFormData.endDate)
        if (aiFormData.goal) formData.append('additionalNotes', aiFormData.goal)

        const response = await api.post('/ai/generate-from-syllabus', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        setShowAIModal(false)
        setAiFormData({
          goalType: 'short',
          subjects: [{ name: '', difficulty: 5, examDate: '' }],
          goal: '',
          customDescription: '',
          startDate: '',
          endDate: '',
          schedule: {
            wakeUpTime: '',
            schoolTime: '',
            tuitionTime: '',
            studyTime: '',
            sleepTime: '',
            notes: ''
          }
        })
        setUseCustomDescription(false)
        setUseSyllabusUpload(false)
        setUploadedFile(null)
        fetchPlans()
        return
      } else {
        payload.subjects = aiFormData.subjects.filter(s => s.name.trim() !== '')
      }

      const response = await api.post('/ai/generate-study-plan', payload)

      setShowAIModal(false)
      setAiFormData({
        goalType: 'short',
        subjects: [{ name: '', difficulty: 5, examDate: '' }],
        goal: '',
        customDescription: '',
        startDate: '',
        endDate: '',
        schedule: {
          wakeUpTime: '',
          schoolTime: '',
          tuitionTime: '',
          studyTime: '',
          sleepTime: '',
          notes: ''
        }
      })
      setUseCustomDescription(false)
      setUseSyllabusUpload(false)
      fetchPlans()
    } catch (error) {
      console.error('Failed to generate AI study plan:', error)
      alert(error.response?.data?.message || 'Failed to generate AI study plan')
    } finally {
      setAiLoading(false)
    }
  }

  const addSubject = () => {
    setAiFormData({
      ...aiFormData,
      subjects: [...aiFormData.subjects, { name: '', difficulty: 5, examDate: '' }]
    })
  }

  const removeSubject = (index) => {
    setAiFormData({
      ...aiFormData,
      subjects: aiFormData.subjects.filter((_, i) => i !== index)
    })
  }

  const updateSubject = (index, field, value) => {
    const updatedSubjects = [...aiFormData.subjects]
    updatedSubjects[index][field] = value
    setAiFormData({
      ...aiFormData,
      subjects: updatedSubjects
    })
  }

  const printTimetable = (plan) => {
    const timetableData = generateTimetable(plan)
    const quizRecommendations = generateQuizRecommendations(plan)

    if (!timetableData) return

    const printWindow = window.open('', '_blank')

    printWindow.document.write(`
      <html>
        <head>
          <title>Study Timetable - ${plan.title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .section-title { 
              font-size: 18px; 
              font-weight: bold; 
              color: #333; 
              margin: 20px 0 10px 0;
            }
            .day-section { 
              margin-bottom: 25px; 
              page-break-inside: avoid;
            }
            .day-header { 
              background-color: #f8f9fa; 
              padding: 10px; 
              border-radius: 5px; 
              font-weight: bold;
              margin-bottom: 10px;
            }
            .study-session { 
              background-color: #f9fafb; 
              border: 1px solid #e5e7eb; 
              margin: 5px 0; 
              padding: 15px; 
              border-radius: 5px;
            }
            .time-slot { 
              font-weight: bold; 
              color: #1f2937; 
              margin-bottom: 5px;
            }
            .priority-high { 
              background-color: #fee2e2; 
              color: white; 
              padding: 2px 8px; 
              border-radius: 3px; 
              font-size: 12px;
            }
            .priority-medium { 
              background-color: #fbbf24; 
              color: #78350f; 
              padding: 2px 8px; 
              border-radius: 3px; 
              font-size: 12px;
            }
            .priority-low { 
              background-color: #dbeafe; 
              color: #065f46; 
              padding: 2px 8px; 
              border-radius: 3px; 
              font-size: 12px;
            }
            .exam-section { 
              background-color: #fef3c7; 
              border: 1px solid #f59e0b; 
              margin: 20px 0; 
              padding: 20px; 
              border-radius: 5px;
            }
            .quiz-section { 
              background-color: #f0f9ff; 
              border: 1px solid #3b82f6; 
              margin: 20px 0; 
              padding: 20px; 
              border-radius: 5px;
            }
            .quiz-item { 
              margin-bottom: 15px; 
              padding: 10px; 
              background-color: #fff; 
              border-radius: 3px;
            }
            @media print { 
              body { margin: 10px; }
              .day-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📚 Study Timetable</h1>
            <h2>${plan.title}</h2>
            <p><strong>Subject:</strong> ${plan.subject}</p>
            <p><strong>Study Period:</strong> ${format(new Date(plan.startDate), 'MMM d, yyyy')} - ${format(new Date(plan.endDate), 'MMM d, yyyy')}</p>
          </div>

          <div class="section-title">📅 Daily Study Schedule</div>
          
          ${timetableData.sessions
            .map((session, index) => `
              <div class="day-section">
                <div class="day-header">
                  📅 ${session.dayName} - ${session.date}
                </div>
                
                ${session.studySessions
                  .map((study) => `
                    <div class="study-session">
                      <div class="time-slot">⏰ ${study.time}</div>
                      <div>
                        <strong>📖 ${study.topic}</strong>
                        <div class="priority-${study.priority}">Priority: ${study.priority.toUpperCase()}</div>
                      </div>
                    </div>
                  `)
                  .join('')}
              </div>
            `)
            .join('')}

          ${quizRecommendations.length > 0 ? `
            <div class="section-title">🎯 Quiz Recommendations</div>
            <div class="quiz-section">
              <h3>📝 Recommended Quiz Schedule</h3>
              
              ${quizRecommendations
                .map((quiz) => `
                  <div class="quiz-item">
                    <h4>📚 ${quiz.subject} Exam Preparation</h4>
                    <p><strong>🗓️ Exam Date:</strong> ${new Date(quiz.examDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p><strong>⏰ Days Until Exam:</strong> ${quiz.daysUntilExam} days</p>
                    <p><strong>📅 Recommended Quiz Date:</strong> ${new Date(quiz.recommendedQuizDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p><strong>🎯 Quiz Type:</strong> ${quiz.quizType}</p>
                    <p><strong>📋 Difficulty Level:</strong> ${quiz.difficulty}/10</p>
                    <p><strong>📋 Suggested Topics:</strong></p>
                    <ul>
                      ${quiz.topics.map(topic => `<li>${topic}</li>`).join('')}
                    </ul>
                  </div>
                `)
                .join('')}
            </div>
          ` : ''}

          <div style="margin-top: 40px; font-size: 12px; color: #666;">
            <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
            <p><em>Print this timetable and keep track of your study progress!</em></p>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.print()
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
      {/* HEADER */}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Study Plans
          </h1>

          <p className="text-gray-600 mt-1">
            Manage your learning schedules
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowAIModal(true)}
            className="btn-primary flex items-center"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            AI Plan Generator
          </button>

          <button
            onClick={() => {
              setEditingPlan(null)

              setFormData({
                title: '',
                subject: '',
                description: '',
                startDate: '',
                endDate: '',
                tasks: []
              })

              setShowModal(true)
            }}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Plan
          </button>
        </div>
      </div>

      {/* PLANS */}

      {plans.length === 0 ? (
        <div className="text-center py-16 card">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />

          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No study plans yet
          </h3>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            Create Study Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div key={plan._id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {plan.title}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {plan.subject}
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-2 text-gray-400 hover:text-primary-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(plan._id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {plan.description && (
                <p className="text-gray-600 text-sm mb-4">
                  {plan.description}
                </p>
              )}

              <div className="flex items-center text-sm text-gray-500 mb-4">
                <Calendar className="w-4 h-4 mr-2" />

                {format(new Date(plan.startDate), 'MMM d')} -{' '}
                {format(new Date(plan.endDate), 'MMM d, yyyy')}
              </div>

              {/* TASKS */}

              {plan.tasks?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Tasks
                  </h4>

                  {plan.tasks.map((task, index) => (
                    <div
                      key={index}
                      className={`flex items-center p-2 rounded-lg ${
                        task.completed
                          ? 'bg-green-50'
                          : 'bg-gray-50'
                      }`}
                    >
                      <button
                        onClick={() =>
                          toggleTaskComplete(
                            plan._id,
                            index,
                            task.completed
                          )
                        }
                        className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${
                          task.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {task.completed && (
                          <Check className="w-3 h-3" />
                        )}
                      </button>

                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            task.completed
                              ? 'line-through text-gray-400'
                              : 'text-gray-700'
                          }`}
                        >
                          {task.title}
                        </p>
                      </div>

                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ACTIONS */}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedPlan(plan)
                    setShowTimetable(true)
                  }}
                  className="btn-secondary"
                >
                  View Timetable
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingPlan
                  ? 'Edit Study Plan'
                  : 'Create Study Plan'}
              </h2>

              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                className="input w-full"
                value={formData.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    title: e.target.value
                  })
                }
                required
              />

              <input
                type="text"
                placeholder="Subject"
                className="input w-full"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    subject: e.target.value
                  })
                }
                required
              />

              <textarea
                placeholder="Description"
                className="input w-full h-24"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value
                  })
                }
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  className="input"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      startDate: e.target.value
                    })
                  }
                  required
                />

                <input
                  type="date"
                  className="input"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      endDate: e.target.value
                    })
                  }
                  required
                />
              </div>

              {/* TASKS */}

              <div>
                <div className="space-y-2 mb-4">
                  {formData.tasks.map((task, index) => (
                    <div
                      key={index}
                      className="flex items-center p-2 bg-gray-50 rounded-lg"
                    >
                      <span className="flex-1 text-sm">
                        {task.title}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeTask(index)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Task title"
                    className="input flex-1"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        title: e.target.value
                      })
                    }
                  />

                  <select
                    className="input"
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        priority: e.target.value
                      })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>

                  <button
                    type="button"
                    onClick={addTask}
                    className="btn-primary"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>

                <button type="submit" className="btn-primary">
                  {editingPlan ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI MODAL */}

      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-purple-600" />
                AI Study Plan Generator
              </h2>
              <button onClick={() => setShowAIModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAISubmit} className="space-y-6">
              {/* Goal Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goal Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="short"
                      checked={aiFormData.goalType === 'short'}
                      onChange={(e) => setAiFormData({...aiFormData, goalType: e.target.value})}
                      className="mr-2"
                    />
                    <div>
                      <div className="font-medium">Short-term</div>
                      <div className="text-sm text-gray-500">Tests & Quizzes</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="long"
                      checked={aiFormData.goalType === 'long'}
                      onChange={(e) => setAiFormData({...aiFormData, goalType: e.target.value})}
                      className="mr-2"
                    />
                    <div>
                      <div className="font-medium">Long-term</div>
                      <div className="text-sm text-gray-500">Exams & Competitive</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Input Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Input Method
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={!useCustomDescription && !useSyllabusUpload}
                      onChange={() => {
                        setUseCustomDescription(false)
                        setUseSyllabusUpload(false)
                      }}
                      className="mr-2"
                    />
                    <div>
                      <div className="font-medium">Structured</div>
                      <div className="text-sm text-gray-500">Add subjects manually</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={useCustomDescription}
                      onChange={() => {
                        setUseCustomDescription(true)
                        setUseSyllabusUpload(false)
                      }}
                      className="mr-2"
                    />
                    <div>
                      <div className="font-medium">Free Form</div>
                      <div className="text-sm text-gray-500">Describe your needs</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={useSyllabusUpload}
                      onChange={() => {
                        setUseCustomDescription(false)
                        setUseSyllabusUpload(true)
                      }}
                      className="mr-2"
                    />
                    <div>
                      <div className="font-medium">Upload</div>
                      <div className="text-sm text-gray-500">PDF/TXT syllabus</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Structured Input */}
              {!useCustomDescription && !useSyllabusUpload && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subjects
                  </label>
                  {aiFormData.subjects.map((subject, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Subject name"
                        className="input flex-1"
                        value={subject.name}
                        onChange={(e) => updateSubject(index, 'name', e.target.value)}
                      />
                      <select
                        className="input w-24"
                        value={subject.difficulty}
                        onChange={(e) => updateSubject(index, 'difficulty', parseInt(e.target.value))}
                      >
                        {[1,2,3,4,5,6,7,8,9,10].map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        className="input"
                        value={subject.examDate}
                        onChange={(e) => updateSubject(index, 'examDate', e.target.value)}
                      />
                      {aiFormData.subjects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubject(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSubject}
                    className="btn-secondary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subject
                  </button>
                </div>
              )}

              {/* Custom Description */}
              {useCustomDescription && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe Your Study Needs
                  </label>
                  <textarea
                    className="input w-full h-32"
                    placeholder="Describe your subjects, current level, goals, exam dates, and any specific requirements..."
                    value={aiFormData.customDescription}
                    onChange={(e) => setAiFormData({...aiFormData, customDescription: e.target.value})}
                    required
                  />
                </div>
              )}

              {/* File Upload */}
              {useSyllabusUpload && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Syllabus or Study Material
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <input
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      onChange={(e) => setUploadedFile(e.target.files[0])}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="btn-primary">
                        Choose File
                      </span>
                    </label>
                    {uploadedFile && (
                      <div className="mt-4 text-sm text-gray-600">
                        Selected: {uploadedFile.name}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Schedule
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="time"
                    placeholder="Wake up time"
                    className="input"
                    value={aiFormData.schedule.wakeUpTime}
                    onChange={(e) => setAiFormData({
                      ...aiFormData,
                      schedule: {...aiFormData.schedule, wakeUpTime: e.target.value}
                    })}
                  />
                  <input
                    type="time"
                    placeholder="School time"
                    className="input"
                    value={aiFormData.schedule.schoolTime}
                    onChange={(e) => setAiFormData({
                      ...aiFormData,
                      schedule: {...aiFormData.schedule, schoolTime: e.target.value}
                    })}
                  />
                  <input
                    type="time"
                    placeholder="Tuition time"
                    className="input"
                    value={aiFormData.schedule.tuitionTime}
                    onChange={(e) => setAiFormData({
                      ...aiFormData,
                      schedule: {...aiFormData.schedule, tuitionTime: e.target.value}
                    })}
                  />
                  <input
                    type="time"
                    placeholder="Preferred study time"
                    className="input"
                    value={aiFormData.schedule.studyTime}
                    onChange={(e) => setAiFormData({
                      ...aiFormData,
                      schedule: {...aiFormData.schedule, studyTime: e.target.value}
                    })}
                  />
                  <input
                    type="time"
                    placeholder="Sleep time"
                    className="input"
                    value={aiFormData.schedule.sleepTime}
                    onChange={(e) => setAiFormData({
                      ...aiFormData,
                      schedule: {...aiFormData.schedule, sleepTime: e.target.value}
                    })}
                  />
                  <input
                    type="text"
                    placeholder="Additional notes"
                    className="input"
                    value={aiFormData.schedule.notes}
                    onChange={(e) => setAiFormData({
                      ...aiFormData,
                      schedule: {...aiFormData.schedule, notes: e.target.value}
                    })}
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={aiFormData.startDate}
                    onChange={(e) => setAiFormData({...aiFormData, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={aiFormData.endDate}
                    onChange={(e) => setAiFormData({...aiFormData, endDate: e.target.value})}
                  />
                </div>
              </div>

              {/* Goal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goal (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Score 90+ in final exams"
                  className="input w-full"
                  value={aiFormData.goal}
                  onChange={(e) => setAiFormData({...aiFormData, goal: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAIModal(false)}
                  className="btn-secondary"
                  disabled={aiLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center"
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Plan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIMETABLE MODAL */}

      {showTimetable && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">
                Study Timetable - {selectedPlan.title}
              </h2>

              <div className="flex gap-2">
                <button
                  onClick={() => printTimetable(selectedPlan)}
                  className="btn-primary flex items-center"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </button>

                <button
                  onClick={() => setShowTimetable(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {generateTimetable(selectedPlan)?.sessions
                ?.length > 0 ? (
                <div className="space-y-4">
                  {generateTimetable(selectedPlan).sessions.map(
                    (session, idx) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4"
                      >
                        <h3 className="font-semibold mb-3">
                          {session.dayName} - {session.date}
                        </h3>

                        <div className="space-y-2">
                          {session.studySessions.map(
                            (study, studyIdx) => (
                              <div
                                key={studyIdx}
                                className="p-3 bg-gray-50 rounded-lg"
                              >
                                <p className="font-medium">
                                  {study.topic}
                                </p>

                                <p className="text-sm text-gray-500">
                                  {study.time}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  No timetable available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudyPlans