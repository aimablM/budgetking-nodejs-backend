// Node.js + Express + Plaid + MongoDB backend

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const plaid = require('plaid');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Models
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  plaidAccessToken: String,
}));

const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  amount: Number,
  category: [String],
  date: String,
}));

// Plaid client
const plaidClient = new plaid.PlaidApi(new plaid.Configuration({
  basePath: plaid.PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
}));

// Routes

// Health Check
app.get('/health', (req, res) => {
  res.send('API is running');
});

// Register
app.post('/api/register', async (req, res) => {
  const { email, password, username } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashed });
  await user.save();
  res.status(201).send({ message: 'User registered' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  const userInfo = {
    username:user.username,
    email:user.email
  };
  res.send({ token, userInfo });
});

//Change Username
app.post('/api/updateUsername', async (req, res) => {
  const {email, username} = req.body;
  const user = await User.findOne({email})
   await User.updateOne({ email: email }, { $set: { username: username } });

   const userInfo = {
    username:user.username,
    email:user.email
  };

   res.send({message:"Successfully updated username", userInfo})
});

//Change Password
app.post('/api/updatePassword', async (req, res) => {
  const {email, newPassword, oldPassword} = req.body;
  const user = await User.findOne({email})
  if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
    return res.status(401).send({ error: 'Invalid credentials' });
  }
  const hashed = await bcrypt.hash(newPassword, 10);
   await User.updateOne({ email: email }, { $set: { password: hashed } });

   res.send({message:"Successfully updated password"})
});

// Auth Middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).send({ error: 'Invalid token' });
  }
}

// Create Link Token
app.post('/api/create_link_token', auth, async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.userId.toString() },
      client_name: 'Finance Tracker',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });

    const sandboxResponse = await plaidClient.sandboxPublicTokenCreate({
      institution_id: 'ins_1', // Test institution
      initial_products: ['transactions'],
      options: {
        override_username: 'user_good',
        override_password: 'pass_good'
      }
    });

    res.send({ 
      link_token: response.data.link_token,
      sandbox_public_token: sandboxResponse.data.public_token
    });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Exchange Public Token
app.post('/api/exchange_token', auth, async (req, res) => {
  try {
    const { public_token } = req.body;
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    await User.findByIdAndUpdate(req.userId, { plaidAccessToken: response.data.access_token });
    res.send({ message: 'Token exchanged successfully' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Get Transactions
app.get('/api/transactions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const now = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);

    const response = await plaidClient.transactionsGet({
      access_token: user.plaidAccessToken,
      start_date: start.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    });

    // Optional: store in DB
    const transactions = response.data.transactions.map(tx => ({
      userId: user._id,
      name: tx.name,
      amount: tx.amount,
      category: tx.category,
      date: tx.date
    }));
    await Transaction.insertMany(transactions);

    res.send(transactions);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Connect to DB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch(err => console.error('MongoDB connection error:', err));
