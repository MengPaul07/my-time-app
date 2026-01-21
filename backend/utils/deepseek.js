const axios = require('axios');
require('dotenv').config();

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const sendToDeepSeek = async (messages) => {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API Key not configured. Please set DEEPSEEK_API_KEY in .env');
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        stream: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
      }
    );

    return response.data.choices[0].message;
  } catch (error) {
    console.error('DeepSeek API Error:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { sendToDeepSeek };
