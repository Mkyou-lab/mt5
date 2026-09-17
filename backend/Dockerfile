FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app files
COPY . .

# Expose port
EXPOSE 5000

# Start app
CMD ["node", "server.js"]
