import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  completed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: Date
});

const studyPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  subjects: [{
    name: {
      type: String,
      required: true
    },
    difficulty: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    examDate: Date
  }],
  description: String,
  difficulty: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  goalType: {
    type: String,
    enum: ['short', 'long'],
    default: 'short'
  },
  studentSchedule: {
    wakeUpTime: String,
    schoolTime: String,
    tuitionTime: String,
    studyTime: String,
    sleepTime: String,
    notes: String
  },
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  tasks: [taskSchema],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

export default mongoose.model('StudyPlan', studyPlanSchema);
