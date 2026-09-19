import { createApp } from "./app";
import { env } from "./config/env";
import { startAlertaDesmontagemWorker } from "./services/alerta-desmontagem.service";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(
    `[dj-decor-api] rodando na porta ${env.PORT} (${env.NODE_ENV})`
  );
  console.log(`[dj-decor-api] CORS liberado para ${env.FRONTEND_URL}`);
  startAlertaDesmontagemWorker();
});
