#!/bin/bash

# This script is a wrapper to run the tests.
# In case one test crashes without cleaning up the containers, 
# it does it after the tests have been run

echo "Running tests"
jasmine-node --verbose --captureExceptions test
exit_code=$?

old_containers=$(docker ps -aq --filter label=__docker_sandbox)
if [ ! -z "$old_containers" ]; then
	echo "Removing sandbox containers"
	echo "$old_containers" | xargs docker rm -f 2>&1 > /dev/null
fi

if [ $exit_code = 0 ]; then
	echo "Tests passed"
else
	echo "Tests failed"
fi

exit $exit_code
