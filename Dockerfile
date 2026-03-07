# Stage 1: Build the React Frontend
FROM node:18-alpine as build-stage
WORKDIR /app

# Copy the frontend package.json dependencies
COPY package*.json ./
RUN npm install

# Copy frontend source and build
COPY . .
RUN npm run build

# Stage 2: Setup the Express Backend
FROM node:18-alpine as production-stage
RUN apk add --no-cache curl
WORKDIR /app

# Copy backend package.json and install production dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy built frontend from Stage 1
COPY --from=build-stage /app/dist ./dist

# Copy the rest of the backend source code
COPY server/ ./server/

# Set environment to production
ENV NODE_ENV=production

# Expose port (Hugging Face defaults to 7860)
EXPOSE 7860

# Start the server
WORKDIR /app/server
CMD ["node", "app.js"]
