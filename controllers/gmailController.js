const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
const config = require("../config");
const parentDir = "user_credentials";
const subDir = "Gmail";
const path = require("path");
const fs = require("fs");

const GOOGLE_CREDENTIALS_PATH = path.join(
  path.resolve(__dirname, "../project_credentials/Gmail"),
  "credentials.json"
);

const http_redirect_url = "http://localhost:3000/gmail/callback";
const https_redirect_url =
  "ohttps://oauth-email-integration.nrender.com/gmail/callback";

module.exports = {
  Authorization: async (req, res) => {
    try {
      const oauth2Client = new OAuth2Client(
        config.settings.gmail_client_id,
        config.settings.gmail_client_secret,
        `${req.protocol}` === "http" ? http_redirect_url : https_redirect_url
      );
      const scopes = [
        config.settings.gmail_user_info_scope,
        config.settings.gmail_email_scope,
      ];
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
      });
      res.redirect(url);
    } catch (error) {
      console.log({ error });
      res.status(400).send("Failed");
    }
  },

  RetrieveTokens: async (req, res) => {
    const { code } = req.query;
    const oauth2Client = new OAuth2Client(
      config.settings.gmail_client_id,
      config.settings.gmail_client_secret,
      `${req.protocol}` === "http" ? http_redirect_url : https_redirect_url
    );
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Use the access token to retrieve the user's email ID
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });
    const { data: userInfo } = await oauth2.userinfo.get();
    module.exports.SaveUserInfo(userInfo.id, { ...tokens, ...userInfo });
    res.send({ ...tokens, ...userInfo });
  },

  SaveUserInfo: async (file_name, credentials) => {
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir);
    if (!fs.existsSync(`${parentDir}/${subDir}`))
      fs.mkdirSync(`${parentDir}/${subDir}`);
    await fs.promises.writeFile(
      `${parentDir}/${subDir}/${file_name}.json`,
      JSON.stringify(credentials)
    );
  },

  RetrieveEmails: async (req, res) => {
    const access_token = req.get("Authorization");
    console.log({ access_token });
    // Set up the credentials object from the access token
    const creds = new google.auth.OAuth2();
    creds.setCredentials(access_token);
    console.log({ creds });

    // Define the email service
    const service = google.gmail({ version: "v1", auth: creds });
    console.log({ service });

    // Define the user to fetch email for (can be 'me' or a specific user ID)
    const userId = "me";

    try {
      // Fetch the emails
      console.log("Fetch the emails");
      const response = await service.users.messages.list({
        userId: userId,
      });
      console.log({ response });
      const messages = response.data.messages || [];
      res.status(200).send(messages);
    } catch (error) {
      console.log("Error block");
      res.status(400).send(error);
    }
  },
};
