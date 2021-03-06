FROM node:10-stretch

RUN mkdir parse

ADD . /parse
WORKDIR /parse
RUN npm install

ENV APP_ID org.vernality.alliance
ENV MASTER_KEY n2vw8wfMsrm4jDSuLMuspiiseBwOIq18rsq6uQ5p
ENV DATABASE_URI mongodb://localhost:27017/alliance

# Optional (default : 'parse/cloud/main.js')
# ENV CLOUD_CODE_MAIN cloudCodePath

# Optional (default : '/parse')
# ENV PARSE_MOUNT mountPath

EXPOSE 1337

# Uncomment if you want to access cloud code outside of your container
# A main.js file must be present, if not Parse will not start

# VOLUME /parse/cloud               

CMD [ "npm", "start" ]
