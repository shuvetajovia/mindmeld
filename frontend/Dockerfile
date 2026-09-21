FROM node:20-slim

WORKDIR /workspace

# Install dependencies first
COPY frontend/package*.json /workspace/
RUN npm install

# Copy frontend source code
COPY frontend/ /workspace/

EXPOSE 5173

# Run Vite dev server in host-exposed mode
CMD ["npm", "run", "dev", "--", "--host"]
