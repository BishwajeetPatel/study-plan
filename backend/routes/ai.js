import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import Quiz from '../models/Quiz.js';
import StudyPlan from '../models/StudyPlan.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, DOC, and DOCX files are allowed'));
    }
  }
});

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

// Helper function to call OpenRouter API
async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is missing in .env');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:5000',
      'X-Title': 'Smart Study Planner'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 8000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error('Invalid response from OpenRouter');
  }

  return data.choices[0].message.content;
}

// Utility function to normalize priority values from AI
function normalizePriority(priority) {
  if (!priority) return 'medium';
  const p = priority.toLowerCase().trim();
  // Map various AI priority values to valid enum
  if (['critical', 'urgent', 'very high', 'highest', 'important'].includes(p)) return 'high';
  if (['high'].includes(p)) return 'high';
  if (['low', 'minor', 'trivial', 'least'].includes(p)) return 'low';
  return 'medium'; // default for medium, normal, or any unexpected value
}

// Utility function to safely parse AI JSON
function parseAIResponse(text) {
  // Clean up common AI JSON issues
  function cleanJsonString(str) {
    // First pass: fix control characters inside string values
    // We need to handle the JSON string-by-string
    let result = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"' && !inString) {
        inString = true;
        result += char;
      } else if (char === '"' && inString) {
        inString = false;
        result += char;
      } else if (inString) {
        // Escape control characters inside strings
        const code = char.charCodeAt(0);
        if (code === 0) result += '\\u0000';
        else if (code === 1) result += '\\u0001';
        else if (code === 2) result += '\\u0002';
        else if (code === 3) result += '\\u0003';
        else if (code === 4) result += '\\u0004';
        else if (code === 5) result += '\\u0005';
        else if (code === 6) result += '\\u0006';
        else if (code === 7) result += '\\u0007';
        else if (code === 8) result += '\\b';
        else if (code === 9) result += '\\t';
        else if (code === 10) result += '\\n';
        else if (code === 11) result += '\\u000b';
        else if (code === 12) result += '\\f';
        else if (code === 13) result += '\\r';
        else if (code < 32) result += '\\u' + code.toString(16).padStart(4, '0');
        else result += char;
      } else {
        result += char;
      }
    }

    return result
      // Remove trailing commas before } or ]
      .replace(/,\s*([}\]])/g, '$1')
      // Remove comments
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
  }

  // Fix truncated JSON by completing incomplete values
  function fixTruncatedJson(str) {
    // Count braces and brackets to check if JSON is complete
    let braces = 0;
    let brackets = 0;
    let inString = false;
    let escapeNext = false;
    let lastWasComma = false;
    let incompleteString = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !inString) {
        inString = true;
      } else if (char === '"' && inString) {
        inString = false;
      } else if (!inString) {
        if (char === '{') braces++;
        else if (char === '}') braces--;
        else if (char === '[') brackets++;
        else if (char === ']') brackets--;
      }

      lastWasComma = (char === ',' && !inString);
    }

    let fixed = str;

    // If we're in the middle of a string, close it
    if (inString) {
      // Find the last unclosed quote
      const lastQuoteIndex = fixed.lastIndexOf('"', fixed.length - 1);
      if (lastQuoteIndex > -1) {
        // Close the string and add placeholder for truncated content
        fixed = fixed.substring(0, lastQuoteIndex + 1) + ' [content truncated...]';
      }
    }

    // Close any unclosed objects or arrays
    while (brackets > 0) {
      fixed += ']';
      brackets--;
    }
    while (braces > 0) {
      fixed += '}';
      braces--;
    }

    // Remove trailing comma if present
    fixed = fixed.replace(/,\s*$/, '');

    return fixed;
  }

  try {
    return JSON.parse(cleanJsonString(text));
  } catch (e1) {
    // Try extracting from code blocks with truncation fix
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        let content = jsonMatch[1].trim();
        content = fixTruncatedJson(content);
        return JSON.parse(cleanJsonString(content));
      } catch (e2) {
        console.log('Code block parse failed:', e2.message);
      }
    }

    // Try finding JSON between braces with truncation fix
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        let extracted = text.substring(firstBrace, lastBrace + 1);
        extracted = fixTruncatedJson(extracted);
        return JSON.parse(cleanJsonString(extracted));
      } catch (e3) {
        console.log('Brace extraction parse failed:', e3.message);
      }
    }

    // Try finding JSON between brackets with truncation fix
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        let extracted = text.substring(firstBracket, lastBracket + 1);
        extracted = fixTruncatedJson(extracted);
        return JSON.parse(cleanJsonString(extracted));
      } catch (e4) {
        console.log('Bracket extraction parse failed:', e4.message);
      }
    }

    console.error('Raw AI response:', text.substring(0, 500));
    throw new Error('Could not parse AI response. The AI returned invalid JSON. Please try again.');
  }
}

// Generate quiz using AI
router.post('/generate-quiz', authenticate, [
  body('subject').trim().notEmpty(),
  body('topic').trim().notEmpty(),
  body('difficulty').isIn(['easy', 'medium', 'hard']),
  body('numQuestions').isInt({ min: 1, max: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { subject, topic, difficulty, numQuestions } = req.body;

    const prompt = `Generate a ${difficulty} level quiz about ${topic} in ${subject}. 
Create ${numQuestions} multiple choice questions.

Return ONLY valid JSON:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Explanation"
    }
  ]
}`;

    const text = await callOpenRouter(prompt);
    const quizData = parseAIResponse(text);

    if (!quizData.title || !Array.isArray(quizData.questions)) {
      throw new Error('Invalid quiz structure');
    }

    const quiz = new Quiz({
      user: req.user._id,
      title: quizData.title,
      subject,
      topic,
      difficulty,
      questions: quizData.questions,
      timeLimit: Math.max(5, numQuestions * 2),
      isAIGenerated: true
    });

    await quiz.save();

    const quizResponse = quiz.toObject();
    quizResponse.questions = quizResponse.questions.map(q => ({
      question: q.question,
      options: q.options
    }));

    res.status(201).json(quizResponse);

  } catch (error) {
    console.error('AI Quiz Generation Error:', error);
    res.status(500).json({
      message: 'Failed to generate quiz',
      error: error.message
    });
  }
});

// Generate AI study plan with structured input
router.post('/generate-study-plan', authenticate, [
  body('goalType').isIn(['short', 'long']),
  body('schedule').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { goalType, subjects, schedule, goal, customDescription } = req.body;
    
    // Only validate subjects if NOT using free-form description mode
    const isFreeFormMode = customDescription && customDescription.trim().length > 10;
    if (!isFreeFormMode) {
      if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ error: 'At least one subject is required' });
      }
      for (const subject of subjects) {
        if (!subject.name || subject.name.trim() === '') {
          return res.status(400).json({ error: 'Subject name is required' });
        }
        if (!subject.difficulty || subject.difficulty < 1 || subject.difficulty > 10) {
          return res.status(400).json({ error: 'Subject difficulty must be between 1 and 10' });
        }
      }
    }

    // Determine date range
    let startDate, endDate, durationDays;
    
    // Find the latest exam date or use provided dates
    const examDates = subjects.filter(s => s.examDate).map(s => new Date(s.examDate));
    const latestExamDate = examDates.length > 0 ? new Date(Math.max(...examDates)) : null;
    
    if (req.body.startDate && req.body.endDate) {
      startDate = req.body.startDate;
      endDate = req.body.endDate;
    } else if (latestExamDate) {
      endDate = latestExamDate.toISOString().split('T')[0];
      const today = new Date();
      startDate = today.toISOString().split('T')[0];
    } else {
      // Default: 30 days for short goals, 90 days for long goals
      const today = new Date();
      startDate = today.toISOString().split('T')[0];
      const future = new Date(today);
      future.setDate(today.getDate() + (goalType === 'short' ? 30 : 90));
      endDate = future.toISOString().split('T')[0];
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const scheduleDesc = `
Wake up: ${schedule?.wakeUpTime || 'Not specified'}
School: ${schedule?.schoolTime || 'Not specified'}
Tuition: ${schedule?.tuitionTime || 'Not specified'}
Preferred study time: ${schedule?.studyTime || 'Not specified'}
Sleep: ${schedule?.sleepTime || 'Not specified'}
Additional notes: ${schedule?.notes || 'None'}
`;

    let prompt;

    if (customDescription && customDescription.trim().length > 10) {
      // Free-form text input mode
      prompt = `Create a personalized study plan based on the student's description.

GOAL TYPE: ${goalType === 'short' ? 'Short-term (Tests/Quizzes)' : 'Long-term (Exams/Competitive)'}

STUDENT'S DESCRIPTION:
${customDescription}

STUDENT'S SCHEDULE:
${scheduleDesc}

PLAN DURATION: ${durationDays} days (from ${startDate} to ${endDate})

Analyze the student's description carefully and create a realistic, personalized study plan that considers:
- Their specific subjects and self-assessed difficulty
- Their available time slots
- Their daily routine and constraints
- Appropriate study session lengths
- Balance between subjects
- Review sessions and breaks

Difficulty guidelines (1-10 scale):
- 1-3: Light sessions (30-45 min), basic concepts
- 4-6: Moderate sessions (45-75 min), standard studying
- 7-8: Intensive sessions (75-120 min), complex topics
- 9-10: Very intensive (90-150 min), advanced/competitive prep

Return ONLY valid JSON:
{
  "title": "Personalized study plan title",
  "tasks": [
    {
      "title": "Subject - Task description",
      "description": "Specific study activity with time recommendation",
      "priority": "high|medium|low",
      "dueDate": "YYYY-MM-DD",
      "recommendedTime": "e.g., 6:00 PM - 7:00 PM"
    }
  ]
}`;
    } else {
      // Structured input mode
      const subjectsList = subjects.map(s => {
        const examInfo = s.examDate ? ` [Exam: ${s.examDate}]` : '';
        return `${s.name} (Difficulty: ${s.difficulty}/10)${examInfo}`;
      }).join(', ');

      const subjectsDetail = subjects.map(s => {
        let sessionLength;
        if (s.difficulty <= 3) sessionLength = '30-45 min';
        else if (s.difficulty <= 6) sessionLength = '45-75 min';
        else if (s.difficulty <= 8) sessionLength = '75-120 min';
        else sessionLength = '90-150 min';
        const examInfo = s.examDate ? ` | Exam: ${s.examDate}` : '';
        return `- ${s.name}: Level ${s.difficulty}/10 → ${sessionLength}${examInfo}`;
      }).join('\n');

      const urgencyNote = goalType === 'short' 
        ? 'Short-term goal: Focus on quick preparation, revision, and test-taking strategies.'
        : 'Long-term goal: Build strong foundations, progressive learning, and comprehensive revision.';

      prompt = `Create a comprehensive ${goalType === 'short' ? 'short-term' : 'long-term'} multi-subject study plan.

GOAL TYPE: ${goalType === 'short' ? 'Short-term (Tests/Quizzes)' : 'Long-term (Exams/Competitive)'}

SUBJECTS TO STUDY:
${subjectsList}

DIFFICULTY BREAKDOWN (1-10 scale):
${subjectsDetail}

${urgencyNote}

PLAN DURATION: ${durationDays} days (from ${startDate} to ${endDate})
STUDENT'S DAILY SCHEDULE:
${scheduleDesc}

Create a smart study plan that:
1. Prioritizes subjects with earlier exam dates
2. Distributes time based on difficulty (harder subjects get more time)
3. Rotates subjects to prevent burnout
4. Considers daily schedule for optimal study slots
5. Assigns appropriate session lengths per difficulty level
6. Includes progressive learning and review sessions
7. Builds intensity as exams approach

Difficulty guidelines:
- 1-3: Light sessions (30-45 min), basic review
- 4-6: Moderate sessions (45-75 min), standard studying
- 7-8: Intensive sessions (75-120 min), deep focus
- 9-10: Very intensive (90-150 min), competitive level

Return ONLY valid JSON:
{
  "title": "Descriptive multi-subject study plan title",
  "tasks": [
    {
      "title": "Subject - Task description",
      "description": "Specific study activity with time recommendation",
      "priority": "high|medium|low",
      "dueDate": "YYYY-MM-DD",
      "recommendedTime": "e.g., 6:00 PM - 7:00 PM"
    }
  ]
}`;
    }

    const text = await callOpenRouter(prompt);
    const planData = parseAIResponse(text);

    if (!planData.title || !Array.isArray(planData.tasks)) {
      throw new Error('Invalid plan structure');
    }

    // Handle subjects - in free-form mode, subjects might be empty
    let subjectsToUse = subjects && subjects.length > 0 ? subjects : [];
    
    // If free-form mode and no subjects, try to extract from AI response or use default
    if (isFreeFormMode && subjectsToUse.length === 0) {
      // Try to extract subjects from task titles (e.g., "Math - Chapter 1")
      const extractedSubjects = [...new Set(
        planData.tasks
          .map(t => t.title?.split(' - ')[0]?.trim())
          .filter(s => s && s.trim().length > 0 && s.length < 50)
      )];
      
      if (extractedSubjects.length > 0) {
        subjectsToUse = extractedSubjects.map(name => ({ 
          name: name.trim(), 
          difficulty: 5,
          examDate: latestExamDate || new Date(endDate)
        })).filter(s => s.name && s.name.length > 0); // Double check no empty names
      }
      
      // If still no valid subjects, use default
      if (subjectsToUse.length === 0) {
        subjectsToUse = [{ 
          name: 'General Studies', 
          difficulty: 5,
          examDate: latestExamDate || new Date(endDate)
        }];
      }
    }

    // Filter out any invalid subjects and ensure we have at least one
    subjectsToUse = subjectsToUse.filter(s => s.name && s.name.trim().length > 0);
    if (subjectsToUse.length === 0) {
      subjectsToUse = [{ name: 'General Studies', difficulty: 5 }];
    }

    // Create main subject string from all subjects
    const mainSubject = subjectsToUse.map(s => s.name).join(', ') || 'Multi-Subject Study Plan';
    const avgDifficulty = subjectsToUse.length > 0 
      ? Math.round(subjectsToUse.reduce((sum, s) => sum + (s.difficulty || 5), 0) / subjectsToUse.length)
      : 5;

    // Debug log
    console.log('Creating study plan with subjects:', subjectsToUse.map(s => s.name));

    // Create study plan in database
    const studyPlan = new StudyPlan({
      user: req.user._id,
      title: planData.title,
      subject: mainSubject,
      subjects: subjectsToUse.map(s => ({ 
        name: s.name.trim(), 
        difficulty: s.difficulty || 5,
        examDate: s.examDate ? new Date(s.examDate) : undefined
      })),
      description: `AI-generated ${goalType}-term plan for: ${mainSubject}. Avg difficulty: ${avgDifficulty}/10. ${goal || ''}`,
      difficulty: avgDifficulty,
      goalType,
      studentSchedule: schedule,
      isAIGenerated: true,
      startDate,
      endDate,
      tasks: planData.tasks.map(task => ({
        title: task.title,
        description: `${task.description}${task.recommendedTime ? ` [Recommended: ${task.recommendedTime}]` : ''}`,
        priority: normalizePriority(task.priority),
        dueDate: task.dueDate,
        completed: false
      }))
    });

    await studyPlan.save();

    res.status(201).json(studyPlan);

  } catch (error) {
    console.error('AI Study Plan Generation Error:', error);
    res.status(500).json({
      message: 'Failed to generate study plan',
      error: error.message
    });
  }
});

// Study suggestions
router.post('/study-suggestions', authenticate, [
  body('subject').trim().notEmpty(),
  body('currentTopic').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { subject, currentTopic } = req.body;

    const prompt = `Provide study suggestions for ${currentTopic} in ${subject}.

Return ONLY valid JSON:
{
  "keyConcepts": [],
  "studyTips": [],
  "resources": [],
  "nextTopics": []
}`;

    const text = await callOpenRouter(prompt);
    const suggestions = parseAIResponse(text);

    res.json(suggestions);

  } catch (error) {
    console.error('AI Suggestions Error:', error);
    res.status(500).json({
      message: 'Failed to generate suggestions',
      error: error.message
    });
  }
});

// Extract text from uploaded file
async function extractTextFromFile(file) {
  if (file.mimetype === 'application/pdf') {
    const data = await pdfParse(file.buffer);
    return data.text;
  } else if (file.mimetype === 'text/plain') {
    return file.buffer.toString('utf-8');
  } else {
    // For DOC/DOCX, return a placeholder (would need additional library)
    throw new Error('DOC/DOCX parsing not yet implemented. Please upload PDF or TXT files.');
  }
}

// Generate study plan from uploaded syllabus/material
router.post('/generate-from-syllabus', authenticate, upload.single('file'), [
  body('goalType').isIn(['short', 'long']),
  body('schedule').isObject(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a syllabus or study material file' });
    }

    const { goalType, schedule, startDate, endDate, additionalNotes } = req.body;

    // Extract text from uploaded file
    let syllabusContent;
    try {
      syllabusContent = await extractTextFromFile(req.file);
    } catch (extractError) {
      return res.status(400).json({ message: extractError.message });
    }

    // Truncate if too long (limit for API)
    const maxLength = 8000;
    const truncatedContent = syllabusContent.length > maxLength 
      ? syllabusContent.substring(0, maxLength) + '\n...[Content truncated due to length]'
      : syllabusContent;

    // Determine date range
    let finalStartDate, finalEndDate;
    
    if (startDate && endDate) {
      finalStartDate = startDate;
      finalEndDate = endDate;
    } else {
      const today = new Date();
      finalStartDate = today.toISOString().split('T')[0];
      const future = new Date(today);
      future.setDate(today.getDate() + (goalType === 'short' ? 30 : 90));
      finalEndDate = future.toISOString().split('T')[0];
    }

    const start = new Date(finalStartDate);
    const end = new Date(finalEndDate);
    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const scheduleDesc = `
Wake up: ${schedule?.wakeUpTime || 'Not specified'}
School: ${schedule?.schoolTime || 'Not specified'}
Tuition: ${schedule?.tuitionTime || 'Not specified'}
Preferred study time: ${schedule?.studyTime || 'Not specified'}
Sleep: ${schedule?.sleepTime || 'Not specified'}
Additional notes: ${schedule?.notes || 'None'}
`;

    const prompt = `Analyze the following syllabus/study material and create a comprehensive ${goalType === 'short' ? 'short-term' : 'long-term'} study plan.

SYLLABUS/STUDY MATERIAL CONTENT:
${truncatedContent}

STUDENT'S SCHEDULE:
${scheduleDesc}

ADDITIONAL NOTES FROM STUDENT:
${additionalNotes || 'None'}

PLAN DURATION: ${durationDays} days (from ${finalStartDate} to ${finalEndDate})
GOAL TYPE: ${goalType === 'short' ? 'Short-term (Tests/Quizzes)' : 'Long-term (Exams/Competitive)'}

Analyze the syllabus carefully and:
1. Identify all topics, chapters, and units mentioned
2. Estimate difficulty based on content complexity
3. Create a progressive learning schedule
4. Allocate appropriate time for each topic based on complexity
5. Include review sessions before exams
6. Consider student's available time slots from their schedule
7. Add buffer days for difficult topics

For ${goalType === 'short' ? 'short-term' : 'long-term'} preparation:
${goalType === 'short' ? '- Focus on quick coverage and revision\n- Emphasize key concepts and likely exam topics\n- Include practice and mock tests' : '- Build strong foundations\n- Include deep study sessions\n- Add multiple revision cycles\n- Include comprehensive practice'}

Return ONLY valid JSON:
{
  "title": "Subject-specific study plan title",
  "subject": "Main subject or course name",
  "difficulty": 5,
  "tasks": [
    {
      "title": "Topic/Chapter name",
      "description": "Specific study activities, resources to use, and time recommendation",
      "priority": "high|medium|low",
      "dueDate": "YYYY-MM-DD",
      "recommendedTime": "e.g., 6:00 PM - 7:30 PM"
    }
  ]
}`;

    const text = await callOpenRouter(prompt);
    const planData = parseAIResponse(text);

    if (!planData.title || !Array.isArray(planData.tasks)) {
      throw new Error('Invalid plan structure from AI');
    }

    // Create study plan in database
    const studyPlan = new StudyPlan({
      user: req.user._id,
      title: planData.title,
      subject: planData.subject || 'Multi-subject',
      description: `AI-generated plan from syllabus. Duration: ${durationDays} days. ${additionalNotes || ''}`,
      difficulty: planData.difficulty || 5,
      goalType,
      studentSchedule: schedule,
      isAIGenerated: true,
      startDate: finalStartDate,
      endDate: finalEndDate,
      tasks: planData.tasks.map(task => ({
        title: task.title,
        description: `${task.description}${task.recommendedTime ? ` [Recommended: ${task.recommendedTime}]` : ''}`,
        priority: normalizePriority(task.priority),
        dueDate: task.dueDate,
        completed: false
      }))
    });

    await studyPlan.save();

    res.status(201).json({
      studyPlan,
      extractedContent: truncatedContent.substring(0, 500) + '...'
    });

  } catch (error) {
    console.error('Syllabus Study Plan Generation Error:', error);
    res.status(500).json({
      message: 'Failed to generate study plan from syllabus',
      error: error.message
    });
  }
});

export default router;