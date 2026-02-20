FROM denoland/deno:2.6.7
WORKDIR /app
RUN chown -R deno:deno /app
USER deno

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
COPY *.ts .
COPY deno.json .
RUN deno install

# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache main.ts

CMD ["run", "--unstable","--allow-all", "main.ts"]
