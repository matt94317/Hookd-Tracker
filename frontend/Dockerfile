# Uses node version 18 on alpine linux for a smaller image size
FROM node:18-alpine

# Goes to the app directory (think of it like a cd terminal)
WORKDIR /app

# Copies the package.json and package-lock.json files to the container (these files contain the app dependencies)
COPY package.json package-lock.json ./

# install app dependencies
RUN npm install

COPY . .

# Run the app
CMD ["npm", "start"]