const dotenv = require("dotenv");
dotenv.config();

const AppSettings = {
  outlook_client_id: process.env.outlook_client_id,
  outlook_client_secret: process.env.outlook_client_secret,
  outlook_authorization_endpoint: process.env.outlook_authorization_endpoint,
  outlook_token_endpoint: process.env.outlook_token_endpoint,
  outlook_graph_endpoint: process.env.outlook_graph_endpoint,
  outlook_scope: process.env.outlook_scope,

  gmail_client_id: process.env.gmail_client_id,
  gmail_client_secret: process.env.gmail_client_secret,
  gmail_project_id: process.env.gmail_project_id,
  gmail_auth_endpoint: process.env.gmail_auth_endpoint,
  gmail_token_endpoint: process.env.gmail_token_endpoint,
  gmail_auth_provide: process.env.gmail_auth_provide,
  gmail_user_info_scope: process.env.gmail_user_info_scope,
  gmail_email_scope: process.env.gmail_email_scope,

  node_application_port: process.env.node_application_port,
};

module.exports = {
  settings: AppSettings,
};
