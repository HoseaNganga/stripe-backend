import express from "express";
import { getUserDetails } from "../controllers/user.controller";

const router = express.Router();

router.get("/profile", getUserDetails);

export default router;
