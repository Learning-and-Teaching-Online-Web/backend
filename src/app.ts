import express from "express";
import cors from "cors";
import rootRouter from "./routes";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./config/swagger";

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api', rootRouter);

export default app;