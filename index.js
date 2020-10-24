var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var path = require('path');
const fs = require('fs');
const https = require('https');

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

// Certificate
const privateKey = fs.readFileSync('/etc/letsencrypt/live/alliance.vernality.net/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/alliance.vernality.net/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/alliance.vernality.net/chain.pem', 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
};

if (!databaseUri) {
    console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
    databaseURI: databaseUri || 'mongodb://localhost:27017/alliance',
    cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
    appId: process.env.APP_ID || 'org.vernality.alliance',
    masterKey: process.env.MASTER_KEY || 'n2vw8wfMsrm4jDSuLMuspiiseBwOIq18rsq6uQ5p', //Add your master key here. Keep it secret!
    serverURL: process.env.SERVER_URL || 'https://alliance.vernality.net/parse',  // Don't forget to change to https if needed
    publicServerURL: 'https://alliance.vernality.net/parse',
    clientKey: 'hWlREY7dvWb7sLpCVfZrReWNKPHh4uJT',
    liveQuery: {
        classNames: [] // List of classes to support for query subscriptions
    }
});

var options = { allowInsecureHTTP: false };

var dashboard = new ParseDashboard({
    "apps": [
        {
            "serverURL": "https://alliance.vernality.net:1337/parse",
            "appId": "org.vernality.alliance",
            "masterKey": "n2vw8wfMsrm4jDSuLMuspiiseBwOIq18rsq6uQ5p",
            "appName": "Alliance"
        }
    ],
    "users":
        [
            {
                "user": "rinat",
                "pass": "AllianceFox1",
                "apps": [{"appId": "org.vernality.alliance"}]
            },
            {
                "user": "temur",
                "pass": "TemurFox1",
                "apps": [{"appId": "org.vernality.alliance"}]
            }
        ]
}, options);

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// make the Parse Server available at /parse
app.use('/parse', api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
    res.redirect('/dashboard');
});

// make the Parse Dashboard available at /dashboard
app.use('/dashboard', dashboard);

var port = process.env.PORT || 1337;
var httpsServer = https.createServer(credentials, app);

httpsServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpsServer);
