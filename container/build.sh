#!/bin/bash
IMAGE_NAME="christophetd/docker-sandbox"
JDK_PATH="jdk8.tar.gz"

if [ $# = 1 ]; then
	IMAGE_NAME="$1"
fi

if [ ! -f "$JDK_PATH" ]; then
	echo "Please download the JDK you wish to include in the image in the file $JDK_PATH" 1>&2
	exit 1
fi

echo "Building image '$IMAGE_NAME'..."
docker build -t $IMAGE_NAME .
