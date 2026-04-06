const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { sendToDeepSeek } = require('./utils/deepseek');
const { recognizeImage } = require('./utils/baidu');
const { ASSISTANT_SYSTEM_PROMPT } = require('./prompts/assistantPrompts');
const db = require('./db/database');
const tasksController = require('./controllers/tasksController');
const coursesController = require('./controllers/coursesController');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Increase limit for image upload
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the backend API!' });
});

// --- Tasks Routes ---
app.get('/api/tasks', tasksController.getAll);
app.post('/api/tasks', tasksController.create);
app.put('/api/tasks/:id', tasksController.update);
app.delete('/api/tasks/:id', tasksController.delete);

// --- Courses Routes ---
app.get('/api/courses', coursesController.getAll);
app.post('/api/courses', coursesController.create);
app.put('/api/courses/:id', coursesController.update);
app.delete('/api/courses/:id', coursesController.delete);

// AI Endpoint
app.post('/api/ai', async (req, res) => {
  const { userInput, tasksContext, coursesContext, history } = req.body;

  // 获取当前本地时间字符串
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
  const currentDate = `${year}-${month}-${day} ${hours}:${minutes} ${weekday}`;
  const currentDateTime = `${year}-${month}-${day}T${hours}:${minutes}:00`;
  const currentTime = `${hours}:${minutes}`;
  const currentHour = String(now.getHours());
  const timePeriod = now.getHours() < 6
    ? '凌晨'
    : now.getHours() < 12
      ? '上午'
      : now.getHours() < 14
        ? '中午'
        : now.getHours() < 19
          ? '下午'
          : '晚上';

  const prompt = ASSISTANT_SYSTEM_PROMPT
      .replace('{{currentDate}}', currentDate)
      .replace('{{currentDateTime}}', currentDateTime)
      .replace('{{currentTime}}', currentTime)
      .replace('{{currentHour}}', currentHour)
      .replace('{{timePeriod}}', timePeriod)
      .replace('{{tasksContext}}', tasksContext || "No tasks Loaded")
      .replace('{{coursesContext}}', coursesContext || "No courses Loaded");

  const messages = [
      { role: 'system', content: prompt },
      ...(history || []),
      { role: 'user', content: userInput }
  ];

  try {
      const aiMsg = await sendToDeepSeek(messages);
      const content = aiMsg.content;
      
      // Extract JSON
      let jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
          jsonStr = jsonStr.substring(start, end + 1);
      }
      
      const result = JSON.parse(jsonStr);
      
      // Backwards compatibility
      if (result.action && !result.actions) {
           res.json({
               reply: result.reply,
               actions: [{ type: result.action, data: result.data }]
           });
           return;
      }
      
      res.json(result);

  } catch (error) {
      console.error("Assistant Processing Error", error);
      res.status(500).json({
          reply: "抱歉，服务端出了点问题。",
          actions: []
      });
  }
});

// OCR Endpoint
app.post('/api/ocr', async (req, res) => {
    const { image } = req.body; // Expects base64 string
  
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }
  
    try {
      const result = await recognizeImage(image);
      res.json(result);
    } catch (error) {
      console.error("OCR API Error", error);
      res.status(500).json({ error: 'OCR Processing Failed' });
    }
  });

// Example: Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
