import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, X, AlertCircle, CheckCircle, BookOpen, TrendingUp, Target, ChevronLeft, ChevronRight, Award, Brain } from 'lucide-react';
import api from '../services/api';

// Calendar component
function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'exam',
    subject: '',
    date: '',
    description: '',
    importance: 'medium'
  });

  // Fetch calendar events
  const fetchEvents = async () => {
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const response = await api.get(`/calendar?month=${month}&year=${year}`);
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  // Fetch upcoming exams
  const fetchUpcomingExams = async () => {
    try {
      const response = await api.get('/calendar/upcoming');
      setUpcomingExams(response.data);
    } catch (error) {
      console.error('Failed to fetch upcoming exams:', error);
    }
  };

  // Fetch performance data for selected date
  const fetchPerformanceData = async (date) => {
    try {
      setLoading(true);
      const dateStr = date.toISOString().split('T')[0];
      const response = await api.get(`/calendar/performance/${dateStr}`);
      setPerformanceData(response.data);
      setShowPerformanceModal(true);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add new event
  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/calendar', formData);
      setShowAddModal(false);
      setFormData({
        title: '',
        type: 'exam',
        subject: '',
        date: '',
        description: '',
        importance: 'medium'
      });
      fetchEvents();
      fetchUpcomingExams();
    } catch (error) {
      alert('Failed to add event: ' + (error.response?.data?.message || error.message));
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId) => {
    try {
      await api.delete(`/calendar/${eventId}`);
      fetchEvents();
      fetchUpcomingExams();
    } catch (error) {
      alert('Failed to delete event: ' + (error.response?.data?.message || error.message));
    }
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // Get events for specific day
  const getEventsForDay = (day) => {
    if (!day) return [];
    // Use local timezone formatting
    const dayStr = day.getFullYear() + '-' + 
                   String(day.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(day.getDate()).padStart(2, '0');
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      const eventStr = eventDate.getFullYear() + '-' + 
                      String(eventDate.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(eventDate.getDate()).padStart(2, '0');
      return eventStr === dayStr;
    });
  };

  // Navigate months
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Handle date selection
  const handleDateSelect = (day) => {
    if (!day) return;
    setSelectedDate(day);
    fetchPerformanceData(day);
  };

  // Get importance color
  const getImportanceColor = (importance) => {
    switch (importance) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Format countdown
  const formatCountdown = (countdown) => {
    if (countdown.days > 0) {
      return `${countdown.days}d ${countdown.hours}h`;
    }
    return `${countdown.hours}h`;
  };

  useEffect(() => {
    fetchEvents();
    fetchUpcomingExams();
  }, [currentDate]);

  const days = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Calendar</h1>
        <p className="text-gray-600">Track your exams, tests, and study progress</p>
      </div>

      {/* Upcoming Exams Countdown */}
      <div className="mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Upcoming Exams</h2>
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          {upcomingExams.length > 0 ? (
            <div className="space-y-3">
              {upcomingExams.slice(0, 3).map((exam) => (
                <div key={exam._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getImportanceColor(exam.importance)}`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{exam.title}</p>
                      <p className="text-sm text-gray-600">{exam.subject} • {exam.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">{formatCountdown(exam.countdown)}</p>
                      <p className="text-xs text-gray-500">until exam</p>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(exam._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete exam"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No upcoming exams scheduled</p>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Week days */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isToday = day && day.toDateString() === new Date().toDateString();
            const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString();

            return (
              <div
                key={index}
                onClick={() => day && handleDateSelect(day)}
                className={`min-h-[80px] p-2 border rounded-lg cursor-pointer transition-all ${
                  !day ? 'bg-gray-50 cursor-default' :
                  isSelected ? 'border-blue-500 bg-blue-50' :
                  isToday ? 'border-orange-500 bg-orange-50' :
                  'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium ${isToday ? 'text-orange-600' : 'text-gray-900'}`}>
                      {day.getDate()}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map((event, idx) => (
                        <div
                          key={idx}
                          className={`text-xs p-1 rounded truncate ${getImportanceColor(event.importance)} text-white`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Event Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Exam/Test</span>
          </button>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add Exam/Test</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  placeholder="e.g., Physics Final Exam"
                  required
                />
              </div>

              <div>
                <label className="label">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input"
                  required
                >
                  <option value="exam">Exam</option>
                  <option value="test">Test</option>
                  <option value="quiz">Quiz</option>
                  <option value="assignment">Assignment</option>
                </select>
              </div>

              <div>
                <label className="label">Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="input"
                  placeholder="e.g., Physics"
                  required
                />
              </div>

              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Importance</label>
                <select
                  value={formData.importance}
                  onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
                  className="input"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input h-20 resize-none"
                  placeholder="Additional notes about this exam/test"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Add Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Performance Modal */}
      {showPerformanceModal && performanceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Performance - {new Date(performanceData.date).toLocaleDateString()}
              </h3>
              <button
                onClick={() => setShowPerformanceModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading performance data...</p>
              </div>
            ) : (
              <div className="space-y-6">
                  {/* Events on this date */}
                  {performanceData.events.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                        Exams/Tests on this day
                      </h4>
                      <div className="space-y-2">
                        {performanceData.events.map((event) => (
                          <div key={event._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${getImportanceColor(event.importance)}`}></div>
                              <div>
                                <p className="font-medium text-gray-900">{event.title}</p>
                                <p className="text-sm text-gray-600">{event.subject} • {event.type}</p>
                              </div>
                            </div>
                            {event.score && (
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-600">{event.score}%</p>
                                <p className="text-xs text-gray-500">Score</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quiz Attempts */}
                  {performanceData.performance.quizAttempts && performanceData.performance.quizAttempts.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Award className="w-5 h-5 mr-2 text-purple-500" />
                        Quiz Attempts
                      </h4>
                      <div className="space-y-3 mb-6">
                        {performanceData.performance.quizAttempts.map((quiz, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                {quiz.isAIGenerated ? (
                                  <Brain className="w-5 h-5 text-purple-600" />
                                ) : (
                                  <Award className="w-5 h-5 text-purple-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{quiz.title}</p>
                                <p className="text-sm text-gray-600">
                                  {quiz.subject} • {quiz.difficulty} • {quiz.totalQuestions} questions
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${
                                quiz.percentage >= 80 ? 'text-green-600' :
                                quiz.percentage >= 60 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {quiz.percentage}%
                              </p>
                              <p className="text-xs text-gray-500">
                                {quiz.score}/{quiz.totalQuestions} correct
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Study Performance */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                      Study Performance
                    </h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{performanceData.performance.completedTasks.length}</p>
                        <p className="text-sm text-gray-600">Completed</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <AlertCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-600">{performanceData.performance.pendingTasks.length}</p>
                        <p className="text-sm text-gray-600">Pending</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{performanceData.performance.completionRate}%</p>
                        <p className="text-sm text-gray-600">Completion Rate</p>
                      </div>
                    </div>

                    {/* Task Lists */}
                    {performanceData.performance.completedTasks.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">Completed Tasks</h5>
                        <div className="space-y-2">
                          {performanceData.performance.completedTasks.map((task, idx) => (
                            <div key={idx} className="flex items-start space-x-2 p-2 bg-green-50 rounded">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                                <p className="text-xs text-gray-600">{task.subject} • {task.priority}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {performanceData.performance.pendingTasks.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Pending Tasks</h5>
                        <div className="space-y-2">
                          {performanceData.performance.pendingTasks.map((task, idx) => (
                            <div key={idx} className="flex items-start space-x-2 p-2 bg-orange-50 rounded">
                              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                                <p className="text-xs text-gray-600">{task.subject} • {task.priority}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarPage;
