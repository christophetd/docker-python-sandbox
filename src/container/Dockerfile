FROM node:argon

RUN ["adduser",  "--home",  "/usr/src/app", "--system", "sandboxuser"]
RUN ["chown", "-R", "sandboxuser", "/usr/src/app"]
RUN ["chmod", "-R", "u+rwx", "/usr/src/app"]

COPY ./shared /usr/src/app

COPY start.sh /
RUN chmod 755 /start.sh

CMD ["/start.sh"]