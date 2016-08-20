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
  		
  		var process = child_process.spawn("python", ["./code.py"], { cwd: __dirname })
  		var output = {stdout: '', stderr: '', combined: ''};
  		
  		process.stdout.on('data', function (data) {
  		    output.stdout += data;
  		    output.combined += data;
  		})
  		
  		process.stderr.on('data', function (data) {
  		    output.stderr += data;
  		    output.combined += data;
  		})
  		
  		process.on('close', function (exitCode) {
  		   res.status(exitCode == 0 ? 200 : 400);
  		   
  		   console.log(JSON.stringify(output));
  		   
  		   res.setHeader('Content-Type', 'application/json');
  		   res.end(JSON.stringify(output));
  		   process.exit(0);
  		});
  	}
});

app.listen(port, function () {
	console.log('Container service running on port '+port);
});