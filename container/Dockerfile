FROM node:argon

RUN ["adduser",  "--home",  "/usr/src/app", "--system", "sandboxuser"]
RUN ["chown", "-R", "sandboxuser", "/usr/src/app"]
RUN ["chmod", "-R", "u+rwx", "/usr/src/app"]

COPY ./shared /usr/src/app
RUN cd /usr/src/app && npm install

COPY start.sh /
RUN chmod 755 /start.sh

RUN apt-get update

# Install python 3
RUN apt-get install -y python3

# Install Java 8
RUN mkdir -p /usr/lib/jvm/
COPY jdk8.tar.gz /tmp/jdk8.tar.gz
RUN tar -xvf /tmp/jdk8.tar.gz -C /usr/lib/jvm/
RUN rm -rf /tmp/jdk8.tar.gz
RUN ln -s /usr/lib/jvm/jdk1.8.0_121/bin/java /usr/bin/java
RUN ln -s /usr/lib/jvm/jdk1.8.0_121/bin/javac /usr/bin/javac

# Install PHP
RUN apt-get install -y php5-cli

CMD ["/start.sh"]
