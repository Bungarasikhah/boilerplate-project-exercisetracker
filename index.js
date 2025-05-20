require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public')); // untuk serving index.html jika ada

const PORT = process.env.PORT || 3003;

// --- MongoDB connection ---
mongoose.connect(process.env.MONGO_URI)

// --- Schemas & Models ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

// --- Routes ---

// Home (optional)
const path = require('path');
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// POST /api/users - Create user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  try {
    const user = new User({ username });
    const saved = await user.save();
    res.json({ username: saved.username, _id: saved._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users - List users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/:_id/exercises - Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const parsedDate = date ? new Date(date) : new Date();
    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: parsedDate
    });

    const saved = await newExercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: saved.date.toDateString(),
      duration: saved.duration,
      description: saved.description
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:_id/logs - Get user logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const query = { userId: _id };

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    let exerciseQuery = Exercise.find(query).select('description duration date');

    if (limit) {
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit)) {
        exerciseQuery = exerciseQuery.limit(parsedLimit);
      }
    }

    const exercises = await exerciseQuery.exec();

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: new Date(e.date).toDateString()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
