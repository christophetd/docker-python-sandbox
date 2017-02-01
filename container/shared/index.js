var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var executor = require('./ExecutorService')

var app = express();

var port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/', function (req, res) {
    
    res.setHeader('Content-Type', 'application/json');
    
  	if (!req.body.code || !req.body.timeoutMs || !req.body.language) {
        res.status(400);
        res.end(JSON.stringify({error: "no code, timeout or language specified"}));
  	}
  	else {
  	    res.status(200);
		executor.execute(req.body.code, req.body.language, req.body.timeoutMs, function(result) {
			res.end(JSON.stringify(result));
		});
  	}
});

app.listen(port, function () {
	console.log('Container service running on port '+port);
});