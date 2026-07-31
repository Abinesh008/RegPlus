# Build Stage
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Build the project
COPY . ./
RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy build artifacts to nginx public folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
