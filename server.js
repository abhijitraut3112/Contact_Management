const express = require('express');
const routes = require('./app/routes/routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
