#!/bin/bash

# This script is a wrapper to run the tests.
# In case one test crashes without cleaning up the containers, 
# it does it after the tests have been run

integration_tests() {
    echo "Running integration tests"
    jasmine-node --verbose --captureExceptions test
    exit_code=$?
}

unit_tests() {
    echo "Running unit tests"
    node_modules/.bin/mocha test/unit/** --require babel-core/register
    exit_code=$?
}

exit_code=1
for arg in "$@"; do
    if [[ $arg == "unit" ]]; then
        unit_tests
    elif [[ $arg == "integration" ]]; then
        integration_tests
    fi

    if [ $exit_code != 0 ]; then
	echo "Tests failed"
	exit $exit_code
    fi
done

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
