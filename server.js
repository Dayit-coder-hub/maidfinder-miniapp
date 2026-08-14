require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files directly from the ROOT directory
app.use(express.static(__dirname));

// Configure Multer for Telebirr Receipt Uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'telebirr-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// In-Memory Database
const MAIDS_DATABASE = [
  { id: "m1", name: "Tigist Alemu", age: 24, experience: "3 years", skills: ["Cooking", "Childcare", "Cleaning"], salary: "4,500 ETB/mo", phone: "+251911223344", rating: "4.9", verified: true },
  { id: "m2", name: "Mekdes Tadesse", age: 27, experience: "5 years", skills: ["Elderly Care", "Cooking", "Deep Clean"], salary: "5,500 ETB/mo", phone: "+251922334455", rating: "4.8", verified: true },
  { id: "m3", name: "Genet Worku", age: 22, experience: "2 years", skills: ["Housekeeping", "Laundry"], salary: "4,000 ETB/mo", phone: "+251933445566", rating: "4.7", verified: true }
];

const BOOKINGS_DB = [];
const PAYMENTS_DB = [];

function verifyTelegramInitData(telegramInitData, botToken) {
  try {
    if (!telegramInitData || !botToken) return false;
    const initData = new URLSearchParams(telegramInitData);
    const hash = initData.get('hash');
    if (!hash) return false;

    initData.delete('hash');
    const dataToCheck = [...initData.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataToCheck).digest('hex');

    return calculatedHash === hash;
  } catch (error) {
    console.error('HMAC error:', error);
    return false;
  }
}

function authenticateTelegram(req, res, next) {
  const initData = req.headers['x-telegram-init-data'];
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (process.env.NODE_ENV === 'development' && !initData) {
    req.telegramUser = { id: 9999999, first_name: "Dev", username: "developer" };
    return next();
  }

  if (verifyTelegramInitData(initData, botToken)) {
    const params = new URLSearchParams(initData);
    req.telegramUser = JSON.parse(params.get('user') || '{}');
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized Telegram Signature' });
  }
}

// ---------------- API ROUTES ----------------

app.get('/api/maids', authenticateTelegram, (req, res) => {
  res.json({ success: true, maids: MAIDS_DATABASE });
});

app.post('/api/bookings', authenticateTelegram, (req, res) => {
  const { maidId, requirement } = req.body;
  const maid = MAIDS_DATABASE.find(m => m.id === maidId);

  if (!maid) return res.status(404).json({ error: "Maid not found" });

  const booking = {
    id: "BK-" + Date.now(),
    userId: req.telegramUser.id,
    userName: req.telegramUser.first_name,
    maidId,
    maidName: maid.name,
    requirement: requirement || "Full-time",
    status: "PENDING_PAYMENT",
    createdAt: new Date().toISOString()
  };

  BOOKINGS_DB.push(booking);
  res.json({ success: true, booking });
});

app.post('/api/payments/telebirr', authenticateTelegram, upload.single('receiptImage'), (req, res) => {
  const { bookingId, transactionRef, amount } = req.body;
  
  if (!bookingId || !transactionRef || !req.file) {
    return res.status(400).json({ error: "Missing required details or receipt." });
  }

  const paymentRecord = {
    id: "PAY-" + Date.now(),
    bookingId,
    userId: req.telegramUser.id,
    telebirrNumber: "+251938967996",
    transactionRef,
    amount: amount || "500 ETB",
    receiptPath: `/uploads/${req.file.filename}`,
    status: "VERIFICATION_PENDING",
    submittedAt: new Date().toISOString()
  };

  PAYMENTS_DB.push(paymentRecord);

  const booking = BOOKINGS_DB.find(b => b.id === bookingId);
  if (booking) booking.status = "VERIFICATION_PENDING";

  res.json({
    success: true,
    message: "Payment receipt uploaded successfully.",
    payment: paymentRecord
  });
});

// Serve index.html directly from root for all web app views
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MaidFinder Server running on port ${PORT}`));  const { bookingId, transactionRef, amount } = req.body;
  
  if (!bookingId || !transactionRef || !req.file) {
    return res.status(400).json({ error: "Missing required details or receipt." });
  }

  const paymentRecord = {
    id: "PAY-" + Date.now(),
    bookingId,
    userId: req.telegramUser.id,
    telebirrNumber: "+251938967996",
    transactionRef,
    amount: amount || "500 ETB",
    receiptPath: `/uploads/${req.file.filename}`,
    status: "VERIFICATION_PENDING",
    submittedAt: new Date().toISOString()
  };

  PAYMENTS_DB.push(paymentRecord);

  const booking = BOOKINGS_DB.find(b => b.id === bookingId);
  if (booking) booking.status = "VERIFICATION_PENDING";

  res.json({
    success: true,
    message: "Payment receipt uploaded successfully.",
    payment: paymentRecord
  });
});

// Serve index.html directly from root for all web app views
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MaidFinder Server running on port ${PORT}`));  res.json({ success: true, booking });
});

// POST: Submit Telebirr Manual Receipt
app.post('/api/payments/telebirr', authenticateTelegram, upload.single('receiptImage'), (req, res) => {
  const { bookingId, transactionRef, amount } = req.body;
  
  if (!bookingId || !transactionRef || !req.file) {
    return res.status(400).json({ error: "Missing required booking ID, transaction reference, or receipt image." });
  }

  const paymentRecord = {
    id: "PAY-" + Date.now(),
    bookingId,
    userId: req.telegramUser.id,
    telebirrNumber: "+251938967996",
    transactionRef,
    amount: amount || "500 ETB",
    receiptPath: `/uploads/${req.file.filename}`,
    status: "VERIFICATION_PENDING",
    submittedAt: new Date().toISOString()
  };

  PAYMENTS_DB.push(paymentRecord);

  // Update Booking Status
  const booking = BOOKINGS_DB.find(b => b.id === bookingId);
  if (booking) booking.status = "VERIFICATION_PENDING";

  res.json({
    success: true,
    message: "Payment receipt uploaded successfully. Our agent will verify your Telebirr transfer.",
    payment: paymentRecord
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MaidFinder Server running on port ${PORT}`));
