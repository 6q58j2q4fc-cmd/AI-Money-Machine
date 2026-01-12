export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Platform API Keys
  devtoApiKey: process.env.DEVDOTTO_API ?? "",
  hastewireApiKey: process.env.HASTEWIRE_API ?? "",
  copymaticApiKey: process.env.COPYMATIC_AI_API_KEY ?? "",
  cjApiKey: process.env.CJ_API_KEY ?? "",
  botpressApiKey: process.env.BOTPRESS_API ?? "",
};
