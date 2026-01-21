const db = require('./db/database');
const { sendToDeepSeek } = require('./utils/deepseek');
const { recognizeImage } = require('./utils/baidu');

async function testDatabase() {
  console.log('--- Testing SQLite Database ---');
  return new Promise((resolve, reject) => {
    const testTask = {
      title: 'Test Task',
      description: 'This is a test task inserted by the test script.',
      start_time: new Date().toISOString(),
      user_id: 'test_user'
    };

    db.run(
      `INSERT INTO tasks (title, description, start_time, user_id) VALUES (?, ?, ?, ?)`,
      [testTask.title, testTask.description, testTask.start_time, testTask.user_id],
      function (err) {
        if (err) {
          console.error('❌ Database Insert Failed:', err.message);
          return reject(err);
        }
        console.log(`✅ Database Insert Success. Task ID: ${this.lastID}`);

        db.get(`SELECT * FROM tasks WHERE id = ?`, [this.lastID], (err, row) => {
          if (err) {
            console.error('❌ Database Query Failed:', err.message);
            return reject(err);
          }
          console.log('✅ Database Query Success:', row);

          db.run(`DELETE FROM tasks WHERE id = ?`, [this.lastID], (err) => {
            if (err) {
              console.error('❌ Database Delete Failed:', err.message);
              return reject(err);
            }
            console.log('✅ Database Delete Success.');
            resolve();
          });
        });
      }
    );
  });
}

async function testDeepSeek() {
  console.log('\n--- Testing DeepSeek API ---');
  // DeepSeek requires the word "JSON" in the prompt when response_format is set to json_object
  const messages = [{ role: 'user', content: 'Say "Hello, World!" in JSON format like {"message": "Hello"}' }];
  try {
    const response = await sendToDeepSeek(messages);
    console.log('✅ DeepSeek API Success:', response.content);
  } catch (error) {
    console.error('❌ DeepSeek API Failed:', error.message);
  }
}

async function runTests() {
  try {
    await testDatabase();
    await testDeepSeek();
    console.log('\nAll tests completed.');
    process.exit(0);
  } catch (error) {
    console.error('\nTests failed.', error);
    process.exit(1);
  }
}

// Give DB some time to initialize
setTimeout(runTests, 1000);
