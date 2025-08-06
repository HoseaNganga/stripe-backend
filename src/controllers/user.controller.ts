import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
      return res.status(401).json({ message: "Access token missing" });
    }

    const decoded: any = jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_SECRET!
    );
    const user = await User.findById(decoded.id).select("name email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        is_verified: user.isVerified,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
