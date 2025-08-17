/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as billing from "../billing.js";
import type * as http from "../http.js";
import type * as launches from "../launches.js";
import type * as lib_adapters_ProductHuntAdapter from "../lib/adapters/ProductHuntAdapter.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_platforms from "../lib/platforms.js";
import type * as lib_usage from "../lib/usage.js";
import type * as platforms from "../platforms.js";
import type * as products from "../products.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  billing: typeof billing;
  http: typeof http;
  launches: typeof launches;
  "lib/adapters/ProductHuntAdapter": typeof lib_adapters_ProductHuntAdapter;
  "lib/auth": typeof lib_auth;
  "lib/platforms": typeof lib_platforms;
  "lib/usage": typeof lib_usage;
  platforms: typeof platforms;
  products: typeof products;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
