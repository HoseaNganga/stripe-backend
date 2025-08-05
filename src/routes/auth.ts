import express from "express";
import { signupUser, verifyUserAccount } from "../controllers/auth.controller";

const router = express.Router();

router.post("/signup", signupUser);

router.post("/verify", verifyUserAccount);

export default router;
