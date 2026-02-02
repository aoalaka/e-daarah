FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config that handles SPA routing and uses PORT env var
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Railway provides PORT env var, nginx needs to listen on it
# Create a script to substitute PORT and start nginx
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'sed -i "s/listen 80/listen ${PORT:-80}/" /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

EXPOSE 80

CMD ["/docker-entrypoint.sh"]
