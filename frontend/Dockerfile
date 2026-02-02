FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build arg for API URL - Railway passes env vars as build args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN echo "Building with VITE_API_URL=$VITE_API_URL" && npm run build

EXPOSE 3000

# Use serve to host static files
CMD npx serve dist -s -l tcp://0.0.0.0:${PORT:-3000}
