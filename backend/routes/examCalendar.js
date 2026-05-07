import express from 'express';
const router = express.Router();
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import ExamCalendar from '../models/ExamCalendar.js';
import StudyPlan from '../models/StudyPlan.js';
import Quiz from '../models/Quiz.js';

// Get all calendar events for a user
router.get('/', authenticate, async (req, res) => {
  try {
    const { month, year } = req.query;
    const userId = req.user._id;
    
    let filter = { user: userId };
    
    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }
    
    const events = await ExamCalendar.find(filter).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ message: 'Failed to fetch calendar events' });
  }
});

// Add new calendar event
router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('type').isIn(['exam', 'test', 'quiz', 'assignment']).withMessage('Invalid type'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('importance').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Normalize date to avoid timezone issues
    const inputDate = new Date(req.body.date);
    const normalizedDate = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
    
    const event = new ExamCalendar({
      ...req.body,
      user: req.user._id,
      date: normalizedDate
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    console.error('Add calendar event error:', error);
    res.status(500).json({ message: 'Failed to add calendar event' });
  }
});

// Update calendar event
router.put('/:id', authenticate, [
  body('title').optional().trim().notEmpty(),
  body('type').optional().isIn(['exam', 'test', 'quiz', 'assignment']),
  body('subject').optional().trim().notEmpty(),
  body('date').optional().isISO8601(),
  body('importance').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Normalize date to avoid timezone issues
    let updateData = { ...req.body };
    if (req.body.date) {
      const inputDate = new Date(req.body.date);
      updateData.date = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
    }
    
    const event = await ExamCalendar.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true }
    );

    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({ message: 'Failed to update calendar event' });
  }
});

// Delete calendar event
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const event = await ExamCalendar.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ message: 'Failed to delete calendar event' });
  }
});

// Get upcoming exams with countdown
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user._id;
    
    const upcomingEvents = await ExamCalendar.find({
      user: userId,
      date: { $gt: now },
      status: 'upcoming'
    }).sort({ date: 1 }).limit(5);
    
    // Add countdown info
    const eventsWithCountdown = upcomingEvents.map(event => {
      const timeDiff = event.date - now;
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return {
        ...event.toObject(),
        countdown: {
          days,
          hours,
          totalHours: Math.floor(timeDiff / (1000 * 60 * 60))
        }
      };
    });
    
    res.json(eventsWithCountdown);
  } catch (error) {
    console.error('Get upcoming exams error:', error);
    res.status(500).json({ message: 'Failed to fetch upcoming exams' });
  }
});

// Get performance data for a specific date
router.get('/performance/:date', authenticate, async (req, res) => {
  try {
    const targetDate = new Date(req.params.date);
    const userId = req.user._id;
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get exam/test events for that date
    const events = await ExamCalendar.find({
      user: userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    
    // Get study plan tasks completed on that date
    const studyPlans = await StudyPlan.find({
      user: userId,
      'tasks.dueDate': { $gte: startOfDay, $lte: endOfDay }
    });
    
    // Get quiz attempts on that date
    const quizzes = await Quiz.find({
      user: userId,
      attempts: {
        $elemMatch: {
          completedAt: { $gte: startOfDay, $lte: endOfDay }
        }
      }
    });
    
    const completedTasks = [];
    const pendingTasks = [];
    const quizAttempts = [];
    
    studyPlans.forEach(plan => {
      plan.tasks.forEach(task => {
        const taskDueDate = new Date(task.dueDate);
        if (taskDueDate >= startOfDay && taskDueDate <= endOfDay) {
          if (task.completed) {
            completedTasks.push({
              title: task.title,
              description: task.description,
              priority: task.priority,
              subject: plan.subject
            });
          } else {
            pendingTasks.push({
              title: task.title,
              description: task.description,
              priority: task.priority,
              subject: plan.subject
            });
          }
        }
      });
    });
    
    // Process quiz attempts
    quizzes.forEach(quiz => {
      quiz.attempts.forEach(attempt => {
        const attemptDate = new Date(attempt.completedAt);
        if (attemptDate >= startOfDay && attemptDate <= endOfDay) {
          quizAttempts.push({
            title: quiz.title,
            subject: quiz.subject,
            difficulty: quiz.difficulty,
            score: attempt.score,
            totalQuestions: attempt.totalQuestions,
            percentage: attempt.percentage,
            completedAt: attempt.completedAt,
            isAIGenerated: quiz.isAIGenerated
          });
        }
      });
    });
    
    res.json({
      date: targetDate,
      events,
      performance: {
        completedTasks,
        pendingTasks,
        totalTasks: completedTasks.length + pendingTasks.length,
        completionRate: completedTasks.length + pendingTasks.length > 0 
          ? Math.round((completedTasks.length / (completedTasks.length + pendingTasks.length)) * 100)
          : 0,
        quizAttempts
      }
    });
  } catch (error) {
    console.error('Get performance data error:', error);
    res.status(500).json({ message: 'Failed to fetch performance data' });
  }
});

export default router;
