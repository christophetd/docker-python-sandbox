#!/bin/sh

dir=$(dirname "$(readlink -f "$0")")
cd $dir/../container
docker rmi -f docker_sandbox
docker build --no-cache=true -t docker_sandbox .
