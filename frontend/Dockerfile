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

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create startup script that replaces PORT in nginx config
RUN printf '#!/bin/sh\nsed -i "s/listen 80;/listen ${PORT:-80};/" /etc/nginx/conf.d/default.conf\nexec nginx -g "daemon off;"\n' > /start.sh && chmod +x /start.sh

CMD ["/bin/sh", "/start.sh"]
