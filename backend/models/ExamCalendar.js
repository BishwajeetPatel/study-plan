import mongoose from 'mongoose';

const examCalendarSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['exam', 'test', 'quiz', 'assignment'],
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  description: String,
  importance: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['upcoming', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  notes: String,
  reminderSet: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
examCalendarSchema.index({ user: 1, date: 1 });

export default mongoose.model('ExamCalendar', examCalendarSchema);
