const config = require("../config");
const axios = require("axios");
const parentDir = "user_credentials";
const subDir = "Outlook";
const fs = require("fs");

const redirect_uri = `http://localhost:${config.settings.node_application_port}/outlook/callback`;
const webhookUrl = `http://localhost:${config.settings.node_application_port}/webhook`;

module.exports = {
  Authorization: (req, res) => {
    const url = new URL(config.settings.outlook_authorization_endpoint);
    url.searchParams.append("client_id", config.settings.outlook_client_id);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("redirect_uri", redirect_uri);
    url.searchParams.append("scope", config.settings.outlook_scope);

    res.redirect(url.toString());
  },

  RetrieveTokens: (req, res) => {
    const { code: authorization_code } = req.query;
    const payload = {
      client_id: config.settings.outlook_client_id,
      client_secret: config.settings.outlook_client_secret,
      redirect_uri: redirect_uri,
      code: authorization_code,
      grant_type: "authorization_code",
      scope: config.settings.outlook_scope,
    };
    console.log({ payload });
    axios
      .post(
        config.settings.outlook_token_endpoint,
        new URLSearchParams(payload)
      )
      .then(async (response) => {
        module.exports.RetrieveUserInfo(response.data);
        res.send(`Please close the tab`);
      })
      .catch((error) => {
        console.error(error);
        res
          .status(500)
          .send("Failed to exchange authorization code for access token");
      });
  },

  RetrieveUserInfo: (payload) => {
    const { access_token } = payload;
    axios
      .get(config.settings.outlook_graph_endpoint + "/me", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
      .then((response) => {
        const { id } = response.data;
        module.exports.SaveUserInfo(id, { ...response.data, payload });
      })
      .catch((error) => {
        console.error(error);
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

  RetrieveEmails: (req, res) => {
    const access_token = req.get("Authorization");
    axios
      .get(config.settings.outlook_graph_endpoint + '/me/messages?&$select=subject,body&$search="Unsubscribe OR unsubscribe"&$top=100', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
      .then(async (response) => {
        console.log({ message_length: response.data.value.length });
        res.send(response.data.value);
      })
      .catch((error) => {
        console.error(error);
        res.status(400).send(error);
      });
  },

  RegenerateAccessToken: (req, res) => {
    const refresh_token = req.get("Refresh-Token");
    const payload = {
      client_id: config.settings.outlook_client_id,
      client_secret: config.settings.outlook_client_secret,
      refresh_token,
      grant_type: "refresh_token",
    };
    axios
      .post(
        config.settings.outlook_token_endpoint,
        new URLSearchParams(payload)
      )
      .then(async (response) => {
        if (response.data.error) {
          res.status(400).send(response.data);
        }
        res.send(response.data);
      })
      .catch((error) => {
        console.error(error);
        res.status(400).send(error);
      });
  },

  RegisterWebhook: (req, res) => {
    const access_token = req.get("Authorization");
    const payload = {
      changeType: "created",
      notificationUrl: webhookUrl,
      resource: "me/mailfolders('inbox')/messages",
      expirationDateTime: "2023-04-30T08:00:00.000Z",
    };
    axios
      .post(
        config.settings.outlook_graph_endpoint + "/subscriptions",
        new URLSearchParams(payload),
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      .then(async (response) => {
        if (response.data.error) {
          res.status(400).send(response.data.error);
        }
        res.send("Success");
      })
      .catch((error) => {
        console.error(error);
        res.status(400).send(error);
      });
  },

  Webhook: (req, res) => {
    return res.status(200).message("Success");
  },
};
