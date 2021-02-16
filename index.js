var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

var DEVELOPMENT = process.env.DEVELOPMENT || false
if(DEVELOPMENT) {
    process.env.SERVER_URL = "http://127.0.0.1:1337/parse"
}

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

var credentials = {};

if(!DEVELOPMENT) {
    // Certificate
    const privateKey = fs.readFileSync('/etc/letsencrypt/live/profitclub.vernality.org/privkey.pem', 'utf8');
    const certificate = fs.readFileSync('/etc/letsencrypt/live/profitclub.vernality.org/cert.pem', 'utf8');
    const ca = fs.readFileSync('/etc/letsencrypt/live/profitclub.vernality.org/chain.pem', 'utf8');

    credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
    };
}

if (!databaseUri) {
    console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
    databaseURI: databaseUri || 'mongodb://localhost:27017/alliance',
    cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
    appId: process.env.APP_ID || 'org.vernality.alliance',
    masterKey: process.env.MASTER_KEY || 'n2vw8wfMsrm4jDSuLMuspiiseBwOIq18rsq6uQ5p', //Add your master key here. Keep it secret!
    serverURL: process.env.SERVER_URL || 'https://profitclub.vernality.org/parse',  // Don't forget to change to https if needed
    publicServerURL: process.env.SERVER_URL || 'https://alliance.vernality.net/parse',
    clientKey: 'hWlREY7dvWb7sLpCVfZrReWNKPHh4uJT',
    liveQuery: {
        classNames: [] // List of classes to support for query subscriptions
    },
    appName: "ProfitClub",
    push: {
        android: {
            apiKey: 'AAAAcPRtrp4:APA91bHpzpRUobrlnGMtTf4cpnpEk6-W5q_fEgQmfY1-rpSJA-DT2iR0ujTn2g67bYRAd2M4Fa8r-8wVG_wO9JL7bIhbAHBSTFi2ykz_rp3rYmkvahpuDknFrGph275qOcKZEGwqKHNV'
        },
        ios: [
            {
                token: {
                    key: 'keys/AuthKey_2WZ28N568X.p8',
                    keyId: "2WZ28N568X",
                    teamId: "5V5EUT3ZXJ"
                },
                topic: 'org.vernality.profitclub',
                production: false
            },
            {
                token: {
                    key: 'keys/AuthKey_2WZ28N568X.p8',
                    keyId: "2WZ28N568X",
                    teamId: "5V5EUT3ZXJ"
                },
                topic: 'org.vernality.profitclub',
                production: true
            }
        ]
    },
    emailAdapter: {
        module: "parse-server-generic-email-adapter",
        options: {
            service: "Yandex",
            from: "profitclub@vernality.org",
            email: "profitclub@vernality.org",
            password: "AynurFox1"
        }
    },
    verifyUserEmails: true,
    //allowClientClassCreation: false //FIXME: DON'T FORGET TO UNCOMMENT IN PRODUCTION
});
var options = {};
if(DEVELOPMENT) {
    options = {allowInsecureHTTP: true};
} else {
    options = {allowInsecureHTTP: false};
}

var dashboard = new ParseDashboard({
    "apps": [
        {
            "serverURL": process.env.SERVER_URL || "https://profitclub.vernality.org:1337/parse",
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

if(DEVELOPMENT) {
    var port = process.env.PORT || 1337;
    var httpServer = http.createServer(app);

    httpServer.listen(port, function () {
        console.log('parse-server DEVELOPMENT running on port ' + port + '.');
    });

    // This will enable the Live Query real-time server
    ParseServer.createLiveQueryServer(httpServer);
} else {
    var port = process.env.PORT || 1337;
    var httpsServer = https.createServer(credentials, app);

    httpsServer.listen(port, function () {
        console.log('parse-server running on port ' + port + '.');
    });

    // This will enable the Live Query real-time server
    ParseServer.createLiveQueryServer(httpsServer);
}
