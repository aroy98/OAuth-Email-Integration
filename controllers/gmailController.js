const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
const config = require("../config");
const parentDir = "user_credentials";
const subDir = "Gmail";
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { authenticate } = require("@google-cloud/local-auth");

const GOOGLE_CREDENTIALS_PATH = path.join(
  path.resolve(__dirname, "../project_credentials/Gmail"),
  "credentials.json"
);

const http_redirect_url = "http://localhost:3000/gmail/callback";
const https_redirect_url =
  "https://oauth-email-integration.onrender.com/gmail/callback";

const deep_link_error_url = "https://webviewlogin.page.link/home";
const deep_link_url = "https://webviewlogin.page.link/deeplink-test";

const CLIENT_ID = config.settings.gmail_client_id;
const CLIENT_SECRET = config.settings.gmail_client_secret;

module.exports = {
  Authorization: (req, res) => {
    const authClient = new OAuth2Client(
      CLIENT_ID,
      CLIENT_SECRET,
      https_redirect_url
    );

    const authUrl = authClient.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    });

    res.redirect(authUrl);
  },

  RetrieveTokens: async (req, res) => {
    const authClient = new OAuth2Client(
      CLIENT_ID,
      CLIENT_SECRET,
      https_redirect_url
    );

    const { tokens } = await authClient.getToken(req.query.code);

    authClient.setCredentials(tokens);

    console.log("Tokens \n");
    console.log(tokens.access_token);
    console.log(tokens.refresh_token);

    const userInfo = google.oauth2({ version: "v2", auth: authClient });

    const { data: profile } = await userInfo.userinfo.get({});

    try {
      const response = await axios.post(
        "https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyBREjiqzzSLA4pd-_5ONK8Zbt56nS3bRLk",
        {
          dynamicLinkInfo: {
            domainUriPrefix: "https://webviewlogin.page.link",
            link: `${deep_link_url}?access_token=${tokens.access_token}`,
            androidInfo: {
              androidPackageName: "com.poc_login.web_view_login",
            },
          },
        }
      );
      const { shortLink } = response.data;
      res.redirect(shortLink);
    } catch (error) {
      console.log({ error });
      res.redirect(deep_link_error_url);
    }

    console.log(`The profile id is ${profile.id}`);
    await module.exports.SaveUserInfo(profile.id, {
      tokens,
      clientId: CLIENT_ID,
      profile,
    });
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
    try {
      const userId = req.query.id;
      const savedData = fs.readFileSync(
        `${parentDir}/${subDir}/${userId}.json`,
        "utf-8"
      );
      const { tokens, clientId, expirationDate } = JSON.parse(savedData);

      const authClient = new OAuth2Client(
        CLIENT_ID,
        CLIENT_SECRET,
        https_redirect_url
      );
      authClient.setCredentials(tokens);

      if (expirationDate && new Date(expirationDate) < new Date()) {
        // Refresh the access token if it has expired
        const refreshedTokens = await authClient.refreshToken(
          tokens.refresh_token
        );
        authClient.setCredentials(refreshedTokens.res.data);
      }

      const gmail = google.gmail({ version: "v1", auth: authClient });

      const response = await gmail.users.messages.list({
        userId: "me",
      });

      const messages = response.data.messages || [];

      const emails = await Promise.all(
        messages.map(async (message) => {
          const msg = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
            format: "full",
          });

          const headers = msg.data.payload.headers;
          const subject = headers.find(
            (header) => header.name === "Subject"
          ).value;
          const from = headers.find((header) => header.name === "From").value;
          const date = headers.find((header) => header.name === "Date").value;
          const body = msg.data.payload.body;
          return {
            id: message.id,
            threadId: message.threadId,
            subject,
            from,
            date,
            body,
          };
        })
      );

      res.json(emails);
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Something went wrong");
    }
  },
};
