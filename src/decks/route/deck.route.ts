import { Router } from "express";
import { authenticateToken } from "../../auth/middleware/auth.middleware";
import { deckController } from "../controller/deck.controller";

export const deckRouter = Router();

deckRouter.use(authenticateToken);

deckRouter.post("/", deckController.create);
deckRouter.get("/mine", deckController.mine);
deckRouter.get("/:id", deckController.getById);
deckRouter.patch("/:id", deckController.update);
deckRouter.delete("/:id", deckController.remove);
