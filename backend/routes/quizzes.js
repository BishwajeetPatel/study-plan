import express from 'express';
import { body, validationResult } from 'express-validator';
import Quiz from '../models/Quiz.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all quizzes for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ user: req.user._id }).select('-questions.correctAnswer -questions.explanation');
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single quiz with questions (without correct answers)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user._id });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    // Remove correct answers for client-side
    const quizObj = quiz.toObject();
    quizObj.questions = quizObj.questions.map(q => ({
      question: q.question,
      options: q.options
    }));
    
    res.json(quizObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get quiz with answers (for review)
router.get('/:id/review', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user._id });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create quiz manually
router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('questions').isArray({ min: 1 }).withMessage('At least one question is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, subject, topic, difficulty, questions, timeLimit } = req.body;

    const quiz = new Quiz({
      user: req.user._id,
      title,
      subject,
      topic,
      difficulty,
      questions,
      timeLimit: timeLimit || 15,
      isAIGenerated: false
    });

    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit quiz attempt
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const { answers } = req.body;
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user._id });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    let score = 0;
    const processedAnswers = answers.map((answer, index) => {
      const isCorrect = answer.selectedOption === quiz.questions[index].correctAnswer;
      if (isCorrect) score++;
      return {
        questionIndex: index,
        selectedOption: answer.selectedOption,
        isCorrect
      };
    });

    const percentage = Math.round((score / quiz.questions.length) * 100);

    const attempt = {
      user: req.user._id,
      answers: processedAnswers,
      score,
      totalQuestions: quiz.questions.length,
      percentage,
      completedAt: new Date()
    };

    quiz.attempts.push(attempt);
    await quiz.save();

    res.json({
      score,
      totalQuestions: quiz.questions.length,
      percentage,
      answers: processedAnswers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete quiz
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get quiz statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ user: req.user._id });
    
    const totalQuizzes = quizzes.length;
    const aiGeneratedQuizzes = quizzes.filter(q => q.isAIGenerated).length;
    const totalAttempts = quizzes.reduce((sum, quiz) => sum + quiz.attempts.length, 0);
    
    let totalScore = 0;
    let totalQuestions = 0;
    quizzes.forEach(quiz => {
      quiz.attempts.forEach(attempt => {
        totalScore += attempt.score;
        totalQuestions += attempt.totalQuestions;
      });
    });
    
    const averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    res.json({
      totalQuizzes,
      aiGeneratedQuizzes,
      totalAttempts,
      averageScore
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
