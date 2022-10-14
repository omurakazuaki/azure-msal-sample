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

const getAccount = async(homeAccountId) => {
  return await msalTokenCache.getAccountByHomeId(homeAccountId);
};

const acquireToken = async({username, password, homeAccountId} = {}) => {

  const scopes = ['openid', 'profile', 'email', 'offline_access', 'https://storage.azure.com/.default'];
  const account = await getAccount(homeAccountId);
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

module.exports = {
  getAccount,
  acquireToken,
};
