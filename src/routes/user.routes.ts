import express from "express";
import UserController from "@controllers/user.controller";
import { ensureAuthenticated } from "@middlewares/auth.middleware";

const router = express.Router();

router.get("/i/:id", UserController.getUser);
router.post("/add", ensureAuthenticated, UserController.createUser);
router.put("/i/:id", ensureAuthenticated, UserController.updateUser);

export default router;
