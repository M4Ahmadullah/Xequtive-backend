# Use official Node.js runtime
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Expose port
EXPOSE 8080

# Run the application
CMD ["npm", "start"] 