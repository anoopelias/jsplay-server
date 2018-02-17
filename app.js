var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var ping = require('./routes/ping');
var submit = require('./routes/submit');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser())

app.get('/api/v1/ping', ping);
app.post('/api/v1/submit', submit);

module.exports = app;
