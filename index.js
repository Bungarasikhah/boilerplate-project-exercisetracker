require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

let users = [];
let exercises = {};

// POST /api/users 
app.post('/api/users', express.urlencoded({ extended: false }), (req, res) => {
  const username = req.body.username;
  const newUser = {
    username,
    _id: generateId()
  };
  users.push(newUser);
  exercises[newUser._id] = [];
  res.json(newUser);
});

// GET /api/users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// POST /api/users/:_id/exercises
app.post('/api/users/:_id/exercises', express.urlencoded({ extended: false }), (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  const user = users.find(u => u._id === userId);
  if (!user) return res.status(400).json({ error: 'User not found' });

  const exerciseDate = date ? new Date(date) : new Date();
  const exercise = {
    description,
    duration: parseInt(duration),
    date: exerciseDate.toDateString()
  };

  exercises[userId].push(exercise);

  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date,
    _id: user._id
  });
});

// GET /api/users/:_id/logs
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const user = users.find(u => u._id === userId);
  if (!user) return res.status(400).json({ error: 'User not found' });

  let log = exercises[userId] || [];

  const { from, to, limit } = req.query;

  if (from) {
    const fromDate = new Date(from);
    log = log.filter(ex => new Date(ex.date) >= fromDate);
  }

  if (to) {
    const toDate = new Date(to);
    log = log.filter(ex => new Date(ex.date) <= toDate);
  }

  if (limit) {
    log = log.slice(0, parseInt(limit));
  }

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log
  });
});

// Function buat generate ID random
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const listener = app.listen(process.env.PORT || 3004, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
