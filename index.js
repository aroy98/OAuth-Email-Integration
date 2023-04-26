const express = require("express");
const app = express();
const config = require('./config');

const gmailRoute = require("./routes/gmail");
const outlookRoute = require("./routes/outlook");
const yahooRoute = require("./routes/yahoo");

app.use('/gmail', gmailRoute);
app.use('/outlook', outlookRoute);
app.use('/yahoo', yahooRoute);

const server_port = config.settings.node_application_port;

app.listen(server_port, async () => {
  console.log(`App listening at http://localhost:${server_port}`);
});
