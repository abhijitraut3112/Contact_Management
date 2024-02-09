const express = require('express');
const bodyParser = require('body-parser');
const contactsController = require('../controllers/contact.controller');

const router = express.Router();
router.use(bodyParser.json());


router.post('/syncContacts', async (req, res) => {
  const { userId, contacts } = req.body;
  try {
    await contactsController.syncContacts(userId, contacts);
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error syncing contacts', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
});

router.get('/findCommonUser', async (req, res) => {
  const { searchNumber } = req.query;
  try {
    const common_users = await contactsController.findCommonUser(searchNumber);
    res.json({ name: '', common_users });
  } catch (error) {
    console.error('Error finding common user', error);
    res.status(500).json({ message: 'An error occurred' });
  }
});


router.get('/getContacts', async (req, res) => {
  const { userId, page, pageSize, searchText } = req.query;
  try {
    const result = await contactsController.getContacts(userId, page, pageSize, searchText);
    res.json(result);
  } catch (error) {
    console.error('Error fetching contacts', error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

module.exports = router;
