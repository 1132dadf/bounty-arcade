FROM mcr.microsoft.com/playwright:v1.49.1-noble
WORKDIR /work
ENV BOUNTY_IMAGE=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npm", "test"]
