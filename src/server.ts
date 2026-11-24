import app from "./app";
import { env } from "./config/env";
import { startEscrowExpirationJob } from "./jobs/escrowExpiration.job";

app.listen(env.port, () => {
    console.log(`Server running at ${env.port}`);
    startEscrowExpirationJob();
});

