import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import type { Express } from "express";
import { storage } from "./storage";

async function forkRepoAndFollow(accessToken: string, username: string) {
  const REPO_TO_FORK = 'mrfrankofcc/subzero-md';
  const USER_TO_FOLLOW = 'mrfr8nk';
  
  try {
    const forkResponse = await fetch(`https://api.github.com/repos/${REPO_TO_FORK}/forks`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SUBZERO-Deploy'
      }
    });
    
    if (!forkResponse.ok) {
      const errorText = await forkResponse.text();
      console.error('Fork failed:', errorText);
    } else {
      console.log(`Successfully forked ${REPO_TO_FORK} for ${username}`);
    }
  } catch (error) {
    console.error('Error forking repo:', error);
  }
  
  try {
    const followResponse = await fetch(`https://api.github.com/user/following/${USER_TO_FOLLOW}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SUBZERO-Deploy',
        'Content-Length': '0'
      }
    });
    
    if (followResponse.ok || followResponse.status === 204) {
      console.log(`Successfully followed ${USER_TO_FOLLOW} for ${username}`);
    } else {
      const errorText = await followResponse.text();
      console.error('Follow failed:', errorText);
    }
  } catch (error) {
    console.error('Error following user:', error);
  }
}

// Function to dynamically detect the GitHub callback URL
function getGitHubCallbackURL(): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/github/callback`;
  }
  
  if (process.env.KOYEB_PUBLIC_DOMAIN) {
    return `https://${process.env.KOYEB_PUBLIC_DOMAIN}/api/auth/github/callback`;
  }
  
  if (process.env.RENDER_EXTERNAL_URL) {
    return `${process.env.RENDER_EXTERNAL_URL}/api/auth/github/callback`;
  }
  
  if (process.env.RENDER_INTERNAL_HOSTNAME && process.env.NODE_ENV === 'production') {
    const hostname = process.env.RENDER_INTERNAL_HOSTNAME;
    if (hostname.includes('onrender.com')) {
      return `https://${hostname}/api/auth/github/callback`;
    }
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/auth/github/callback`;
  }
  
  if (process.env.HEROKU_APP_NAME) {
    return `https://${process.env.HEROKU_APP_NAME}.herokuapp.com/api/auth/github/callback`;
  }
  
  if (process.env.CALLBACK_URL) {
    return process.env.CALLBACK_URL.replace('/google/callback', '/github/callback');
  }
  
  if (process.env.NODE_ENV === 'production' && process.env.PORT) {
    console.warn('Production environment detected but no platform-specific URL found. Please set CALLBACK_URL environment variable.');
    return `https://subzero-deploy.onrender.com/api/auth/github/callback`;
  }
  
  return 'http://localhost:5000/api/auth/github/callback';
}

export async function setupGitHubAuth(app: Express) {
  const callbackURL = getGitHubCallbackURL();
  console.log('GitHub OAuth callback URL:', callbackURL);

  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: callbackURL,
    scope: ['user:email', 'repo', 'user:follow']
  }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value || `${profile.username}@github-noemail.local`;
      
      const existingUser = await storage.getUserByGitHubId(profile.id);
      const isNewConnection = !existingUser || !existingUser.githubAccessToken;
      
      const userData = {
        githubId: profile.id,
        githubUsername: profile.username,
        githubProfileUrl: profile.profileUrl,
        githubAccessToken: accessToken,
        email: email,
        firstName: profile.displayName?.split(' ')[0] || profile.username,
        lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: profile.photos?.[0]?.value || '',
        authProvider: 'github' as const,
        emailVerified: true,
        coinBalance: 100,
        status: 'active' as const,
        role: 'user' as const,
        isAdmin: false,
        restrictions: [],
        ipHistory: [],
        deviceHistory: [],
        maxAccountsPerDevice: 1,
        deviceAccountCount: 0,
        maxBots: 10,
        currentBotCount: 0,
      };

      const user = await storage.upsertUser(userData);
      
      if (isNewConnection) {
        try {
          await forkRepoAndFollow(accessToken, profile.username);
          await storage.updateUserGitHubForkStatus(user._id.toString(), `${profile.username}/subzero-md`, true);
        } catch (error) {
          console.error('Error forking repo and following:', error);
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));

  app.get('/api/auth/github',
    passport.authenticate('github', { scope: ['user:email', 'repo', 'user:follow'] })
  );

  app.get('/api/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (user) {
          const deviceFingerprint = (req.session as any)?.deviceFingerprint;
          const deviceCookie = (req.session as any)?.deviceCookie;
          
          if (deviceFingerprint && deviceCookie) {
            const deviceCheck = await storage.checkDeviceAccountCreationLimit(deviceFingerprint, deviceCookie);
            
            if (!deviceCheck.allowed) {
              await storage.deleteUser(user._id.toString(), 'system');
              
              req.logout((err) => {
                if (err) console.error('Logout error:', err);
                res.redirect(`/login?error=multiple_accounts&reason=${encodeURIComponent(deviceCheck.reason || 'Device blocked')}`);
              });
              return;
            }
            
            await storage.addAccountToDevice(deviceFingerprint, user._id.toString());
            await storage.updateUserDeviceFingerprint(user._id.toString(), deviceFingerprint);
            await storage.updateUserActivity(user._id.toString());
          }
        }
      } catch (error) {
        console.error('Error in GitHub OAuth callback:', error);
        
        if (error instanceof Error && error.message.includes('Multiple accounts detected')) {
          req.logout((err) => {
            if (err) console.error('Logout error:', err);
            res.redirect('/login?error=multiple_accounts');
          });
          return;
        }
      }
      
      res.redirect('/');
    }
  );
}
