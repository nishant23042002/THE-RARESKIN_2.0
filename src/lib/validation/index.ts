/**
 * Isomorphic validation schemas. Import from `@/lib/validation` on both the
 * client (form validation) and the server (request validation) so a rule is
 * defined exactly once.
 */
export * from "./primitives";
export * from "./auth";
export * from "./commerce";
export * from "./contact";
export * from "./media";
export * from "./notification";
export * from "./product";
export * from "./review";
export * from "./site-settings";
export * from "./user";
