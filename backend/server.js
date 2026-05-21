require('dotenv').config();

const app = require('./app');
const { initDatabase } = require('./src/db/init');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initialize database
  await initDatabase();
});

// Allow port reuse on Windows
server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port 3000 is still in use. Waiting 10 seconds and retrying...');
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 10000);
  }
});