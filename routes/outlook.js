const express = require("express");
const router = express.Router();
const outlookController = require("../controllers/outlookController");

router.get("/", outlookController.Authorization);
router.get("/callback", outlookController.RetrieveTokens);
router.get("/access-token", outlookController.RegenerateAccessToken);
router.get("/emails", outlookController.RetrieveEmails);
router.get("/subscribe-email", outlookController.RegisterWebhook);
router.get("/webhook", outlookController.RetrieveEmails);

module.exports = router;
