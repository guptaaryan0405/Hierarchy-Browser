# Stage 1: Build the React Application
FROM node:18-alpine as build

WORKDIR /app

# Copy package files (cache dependency layer)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Stage 2: Serve the Static Files with Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built artifacts from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config to support Single Page Application (SPA) routing
# (Optional: creating a simple inline config or relying on default if no complex routing needed)
# For SPA, we often need to redirect 404s to index.html. 
# Let's add a basic config snippet.
RUN echo 'server { \
    listen 80; \
    location / { \
        root   /usr/share/nginx/html; \
        index  index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    error_page   500 502 503 504  /50x.html; \
    location = /50x.html { \
        root   /usr/share/nginx/html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
