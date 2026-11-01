export type CloseBehavior = "ask" | "minimize" | "quit";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type InvestmentRange = "undisclosed" | "upTo5k" | "from5kTo20k" | "from20kTo100k" | "above100k";
export type SecretKind =
  | "typesafeApiKey"
  | "redditClientId"
  | "redditClientSecret"
  | "xBearerToken"
  | "brapiToken";

export interface AppSettings {
  setupCompleted: boolean;
  language: "pt-BR" | "en";
  backgroundCollectionEnabled: boolean;
  launchOnStartupEnabled: boolean;
  closeBehavior: CloseBehavior;
  localApiEnabled: boolean;
  telemetryEnabled: boolean;
  alertLevel: 1 | 2 | 3 | 4;
  watchlistLimit: number;
  experienceLevel: ExperienceLevel;
  investmentRange: InvestmentRange;
}

export interface SecretStatus {
  typesafeApiKey: boolean;
  redditClientId: boolean;
  redditClientSecret: boolean;
  xBearerToken: boolean;
  brapiToken: boolean;
}
