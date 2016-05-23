FROM node:argon

LABEL __docker_sandbox = 1
VOLUME ["/usr/src/app"]
COPY start.sh /
RUN chmod 755 /start.sh
CMD ["/start.sh"]