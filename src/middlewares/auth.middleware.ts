import { Request, Response, NextFunction } from "express";

// Middleware to check if user is authenticated
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({
        success: false,
        message: "Authentication required"
    });
};

// Middleware to check if user is not authenticated (for login routes)
export const ensureNotAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.status(400).json({
        success: false,
        message: "Already authenticated"
    });
};
