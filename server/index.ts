import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

// Function to check if maintenance mode should end
async function checkMaintenanceEndTime(storage: any) {
  try {
    const isMaintenanceMode = await storage.isMaintenanceModeEnabled();
    if (!isMaintenanceMode) return;

    const endTimeSetting = await storage.getAppSetting('maintenance_end_time');
    if (!endTimeSetting || !endTimeSetting.value) return;

    const endTime = new Date(endTimeSetting.value);
    const now = new Date();

    if (now >= endTime) {
      // Maintenance time has expired, disable maintenance mode
      await storage.setMaintenanceMode(false, 'system', 'Maintenance completed automatically');
      await storage.deleteAppSetting('maintenance_end_time');
      await storage.deleteAppSetting('maintenance_estimated_time');
      
      console.log('Maintenance mode automatically disabled at', now.toISOString());
      
      // Create admin notification
      await storage.createAdminNotification({
        type: 'maintenance_auto_end',
        title: 'Maintenance Mode Auto-Disabled',
        message: 'Maintenance mode was automatically disabled as the countdown reached zero.',
        data: { endTime: endTime.toISOString(), disabledAt: now.toISOString() },
        read: false
      });
    }
  } catch (error) {
    console.error('Error in maintenance countdown checker:', error);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Start maintenance countdown checker
  setInterval(async () => {
    try {
      await checkMaintenanceEndTime(storage);
    } catch (error) {
      console.error('Error checking maintenance end time:', error);
    }
  }, 30000); // Check every 30 seconds

  // Start daily billing scheduler
  setInterval(async () => {
    try {
      console.log('Processing daily deployment charges...');
      await storage.processDeploymentDailyCharges();
      console.log('Daily deployment charges processed successfully');
    } catch (error) {
      console.error('Error processing daily deployment charges:', error);
    }
  }, 24 * 60 * 60 * 1000); // Run every 24 hours

  // Process charges immediately on startup for any overdue deployments
  setTimeout(async () => {
    try {
      console.log('Processing any overdue deployment charges on startup...');
      await storage.processDeploymentDailyCharges();
    } catch (error) {
      console.error('Error processing startup deployment charges:', error);
    }
  }, 10000); // Wait 10 seconds after startup

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
