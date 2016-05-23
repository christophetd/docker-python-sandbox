var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var child_process = require('child_process');

var app = express();

var port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/', function (req, res) {
  	if (!req.body.code) {
        res.status(400);
        res.end(JSON.stringify({error: "no code specified"}));
  	}
  	else {
  		// Write code to file
  		fs.writeFileSync('./code.py', req.body.code);
  		
  		// Execute code
  		child_process.exec('python ./code.py > output.txt 2>&1', function (err, stdout) {
  			if (err) {
  				res.status(500);
  				res.end();
  				return;
  			}	
  			res.status(200);
  			res.end(fs.readFileSync('./output.txt'));
  		});
  	}
  	
});

app.listen(port, function () {
	console.log('Container service running on port '+port);
});