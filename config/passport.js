const LocalStrategy = require('passport-local');
const msal = require('@azure/msal-node');

const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Verbose,
    }
  }
};

const pca = new msal.PublicClientApplication(msalConfig);
const msalTokenCache = pca.getTokenCache();

const acquireToken = async({username, password, homeAccountId} = {}) => {

  const scopes = ['openid', 'profile', 'email', 'offline_access', 'https://storage.azure.com/.default'];
  const account = await msalTokenCache.getAccountByHomeId(homeAccountId);
  if (account) {
    // Acquire Token Silently if an account is present
    const token = await pca.acquireTokenSilent({
      account: account,
      scopes,
      forceRefresh: (account.idTokenClaims.exp - 60 < Date.now() / 1000)
    });
    console.log('Successful silent token acquisition');
    return token;

  } else {
    // fall back to username password if there is no account
    const token = await pca.acquireTokenByUsernamePassword({
      scopes,
      username,
      password,
    });
    console.log('acquired token by password grant');
    return token;
  }
};

module.exports = passport => {

  passport.serializeUser((token, done) => {
    console.log(token)
    done(null, token.account.homeAccountId);
  });

  passport.deserializeUser(async(homeAccountId, done) => {
    try {
    console.log(homeAccountId)
      const token = await acquireToken({homeAccountId});
      done(null, token);
    } catch(e) {
      done(e, e.errorMessage);
    }
  });

  passport.use(
    new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password',
    },
    async (username, password, done) => {
      try {
        const token = await acquireToken({username, password});
        return done(null, token)
      } catch(e) {
        return done(null, false, e.errorMessage)
      }
    }
  ));

};
