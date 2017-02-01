var fs = require('fs');
var child_process = require('child_process');
var _ = require('underscore');
var extensions = require('./extensions')
var ExecutorService = {};


ExecutorService.execute = function (code, languageName, timeoutMs, cb) {

    // Create a file containing the code
    var filename = './code' + (extensions[languageName] || '');
    fs.writeFileSync(filename, code);

    // Execute the code
    var executor = __dirname + '/executors/' + languageName + '.sh';
    if (!fs.existsSync(executor)) {
        throw new Error("I don't know how to execute the " + languageName + " language");
    }

    console.log('Running ' + executor + ' "' + filename + '"')
    var job = child_process.spawn(executor, [ filename ], { cwd: __dirname })
    var output = {stdout: '', stderr: '', combined: ''};
    
    job.stdout.on('data', function (data) {
        output.stdout += data;
        output.combined += data;
    })
    
    job.stderr.on('data', function (data) {
        output.stderr += data;
        output.combined += data;
    })

    // Timeout logic
    var timeoutCheck = setTimeout(function () {
        console.error("Process timed out. Killing")
        job.kill('SIGKILL');
        var result = _.extend(output, { timedOut: true, isError: true, killedByContainer: true });
        cb(result);
    }, timeoutMs)
    
    job.on('close', function (exitCode) {
        clearTimeout(timeoutCheck);
        var result = _.extend(output, { isError: exitCode != 0 })
        cb(result);
    });
};

module.exports = ExecutorService;