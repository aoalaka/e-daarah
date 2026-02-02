FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

# Use serve to host static files - shell form to expand $PORT
CMD npx serve dist -s -l tcp://0.0.0.0:${PORT:-3000}
