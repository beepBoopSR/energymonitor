require('dotenv').config();
const express = require('express');
const settingsRoutes = require('./routes/settings');

const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors())

app.use('/api', require('./routes/readings'));
app.use('/api', require('./routes/tips'));
app.use('/api', settingsRoutes);
app.use('/api', require('./routes/clamps'))
app.use('/api/outages', require('./routes/outages'));
app.use('/api/location', require('./routes/location'));

app.get('/', (req, res) => res.send('beepBoop backend running.'));

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`beepBoop backend on port ${PORT}`);
});