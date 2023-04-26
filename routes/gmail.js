const express = require("express");
const router = express.Router();
const gmailController = require("../controllers/gmailController");

router.get("/", gmailController.Authorization);
router.get("/callback", gmailController.RetrieveTokens);
router.get("/emails", gmailController.RetrieveEmails);

module.exports = router;
