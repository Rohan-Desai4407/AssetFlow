require('dotenv').config();
const app = require('./app');
const { initSchema, DB_PATH } = require('./db');
const { startScheduler } = require('./jobs/scheduler');

initSchema();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`AssetFlow API listening on http://localhost:${PORT}`);
  console.log(`SQLite database file: ${DB_PATH}`);
  startScheduler();
});
