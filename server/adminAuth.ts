import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";

// Parse admin credentials from environment
function parseAdminCredentials() {
  const adminCredentials: { [key: string]: { email: string; password: string } } = {};
  
  // Look for ADMIN1, ADMIN2, etc. in environment variables
  for (const key in process.env) {
    if (key.startsWith('ADMIN') && key.match(/^ADMIN\d+$/)) {
      const value = process.env[key];
      if (value && value.includes(',')) {
        const [email, password] = value.split(',');
        if (email && password) {
          adminCredentials[key] = { email: email.trim(), password: password.trim() };
        }
      }
    }
  }
  
  return adminCredentials;
}

// Middleware to check if user is authenticated as admin
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if user is logged in first
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = req.user as any;
    
    // Check if user has admin role
    if (!user.isAdmin || (user.role !== "admin" && user.role !== "super_admin")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Admin authentication error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
}

// Admin login function
export async function adminLogin(req: Request, res: Response) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    // Check against environment admin credentials
    const adminCredentials = parseAdminCredentials();
    
    let isValidAdmin = false;
    for (const adminKey in adminCredentials) {
      const admin = adminCredentials[adminKey];
      if (admin.email === email && admin.password === password) {
        isValidAdmin = true;
        break;
      }
    }

    if (!isValidAdmin) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    // Create or update admin user in database
    let adminUser = await storage.getUserByEmail(email);
    
    if (!adminUser) {
      // Create admin user if doesn't exist
      const hashedPassword = await bcrypt.hash(password, 12);
      const userData = {
        email,
        password: hashedPassword,
        authProvider: "admin",
        emailVerified: true,
        isAdmin: true,
        role: "admin",
        status: "active",
        coinBalance: 0, // Admins don't need coins
        restrictions: []
      };

      const result = await storage.createLocalUser(userData);
      adminUser = await storage.getUser(result.insertedId.toString());
    } else {
      // Update existing user to admin if not already
      if (!adminUser.isAdmin) {
        await storage.updateUserRole(adminUser._id.toString(), "admin");
        adminUser = await storage.getUser(adminUser._id.toString());
      }
    }

    if (!adminUser) {
      return res.status(500).json({ message: "Failed to create admin user" });
    }

    // Log in the user using passport  
    req.logIn(adminUser, (err) => {
      if (err) {
        console.error("Admin login error:", err);
        if (res.headersSent) {
          return;
        }
        return res.status(500).json({ message: "Login failed" });
      }
      
      if (res.headersSent) {
        return;
      }
      
      res.json({
        message: "Admin login successful",
        user: {
          _id: adminUser._id,
          email: adminUser.email,
          isAdmin: adminUser.isAdmin,
          role: adminUser.role,
          status: adminUser.status,
        }
      });
    });

  } catch (error) {
    console.error("Admin login error:", error);
    if (res.headersSent) {
      return;
    }
    res.status(500).json({ message: "Login failed" });
  }
}

// Check if user is super admin (for promoting other users to admin)
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = req.user as any;
    
    // Check admin credentials from env to determine super admin
    const adminCredentials = parseAdminCredentials();
    let isSuperAdmin = false;
    
    for (const adminKey in adminCredentials) {
      const admin = adminCredentials[adminKey];
      if (admin.email === user.email) {
        isSuperAdmin = true;
        break;
      }
    }

    if (!isSuperAdmin && user.role !== "super_admin") {
      return res.status(403).json({ message: "Super admin access required" });
    }

    next();
  } catch (error) {
    console.error("Super admin authentication error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
}