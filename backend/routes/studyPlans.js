import express from 'express';
import { body, validationResult } from 'express-validator';
import StudyPlan from '../models/StudyPlan.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all study plans for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const studyPlans = await StudyPlan.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(studyPlans);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single study plan
router.get('/:id', authenticate, async (req, res) => {
  try {
    const studyPlan = await StudyPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found' });
    }
    res.json(studyPlan);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create study plan
router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, subject, description, startDate, endDate, tasks } = req.body;

    const studyPlan = new StudyPlan({
      user: req.user._id,
      title,
      subject,
      description,
      startDate,
      endDate,
      tasks: tasks || []
    });

    await studyPlan.save();
    res.status(201).json(studyPlan);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update study plan
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, subject, description, startDate, endDate, tasks, status } = req.body;

    const studyPlan = await StudyPlan.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, subject, description, startDate, endDate, tasks, status },
      { new: true }
    );

    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found' });
    }

    // Recalculate progress
    if (studyPlan.tasks && studyPlan.tasks.length > 0) {
      const completedTasks = studyPlan.tasks.filter(t => t.completed).length;
      studyPlan.progress = Math.round((completedTasks / studyPlan.tasks.length) * 100);
      await studyPlan.save();
    }

    res.json(studyPlan);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update task completion
router.patch('/:id/tasks/:taskIndex', authenticate, async (req, res) => {
  try {
    const { completed } = req.body;
    const studyPlan = await StudyPlan.findOne({ _id: req.params.id, user: req.user._id });

    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found' });
    }

    if (studyPlan.tasks[req.params.taskIndex]) {
      studyPlan.tasks[req.params.taskIndex].completed = completed;
      
      // Recalculate progress
      const completedTasks = studyPlan.tasks.filter(t => t.completed).length;
      studyPlan.progress = Math.round((completedTasks / studyPlan.tasks.length) * 100);
      
      await studyPlan.save();
    }

    res.json(studyPlan);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete study plan
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const studyPlan = await StudyPlan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found' });
    }
    res.json({ message: 'Study plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get study statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const totalPlans = await StudyPlan.countDocuments({ user: req.user._id });
    const activePlans = await StudyPlan.countDocuments({ user: req.user._id, status: 'active' });
    const completedPlans = await StudyPlan.countDocuments({ user: req.user._id, status: 'completed' });
    
    const allPlans = await StudyPlan.find({ user: req.user._id });
    const averageProgress = allPlans.length > 0 
      ? Math.round(allPlans.reduce((sum, plan) => sum + plan.progress, 0) / allPlans.length)
      : 0;

    res.json({
      totalPlans,
      activePlans,
      completedPlans,
      averageProgress
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
