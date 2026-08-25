/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAssessmentItems from "../adminAssessmentItems.js";
import type * as adminAssessments from "../adminAssessments.js";
import type * as adminAudit from "../adminAudit.js";
import type * as adminContent from "../adminContent.js";
import type * as adminMedia from "../adminMedia.js";
import type * as adminMembers from "../adminMembers.js";
import type * as adminPosts from "../adminPosts.js";
import type * as adminThemes from "../adminThemes.js";
import type * as adminUsers from "../adminUsers.js";
import type * as assessmentAttempts from "../assessmentAttempts.js";
import type * as assessmentClone from "../assessmentClone.js";
import type * as assessmentCloneRunner from "../assessmentCloneRunner.js";
import type * as assessmentMaintenance from "../assessmentMaintenance.js";
import type * as assessmentMedia from "../assessmentMedia.js";
import type * as assessmentMediaNode from "../assessmentMediaNode.js";
import type * as assessmentReviews from "../assessmentReviews.js";
import type * as assessmentValidators from "../assessmentValidators.js";
import type * as assessments from "../assessments.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_adminAuth from "../lib/adminAuth.js";
import type * as lib_assessmentAdmin from "../lib/assessmentAdmin.js";
import type * as lib_assessmentAuth from "../lib/assessmentAuth.js";
import type * as lib_assessmentEngine from "../lib/assessmentEngine.js";
import type * as lib_assessmentMedia from "../lib/assessmentMedia.js";
import type * as lib_assessmentModel from "../lib/assessmentModel.js";
import type * as lib_assessmentScoring from "../lib/assessmentScoring.js";
import type * as lib_editorDocument from "../lib/editorDocument.js";
import type * as lib_media from "../lib/media.js";
import type * as members from "../members.js";
import type * as posts from "../posts.js";
import type * as publicThemes from "../publicThemes.js";
import type * as r2 from "../r2.js";
import type * as seed from "../seed.js";
import type * as siteContent from "../siteContent.js";
import type * as submissions from "../submissions.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAssessmentItems: typeof adminAssessmentItems;
  adminAssessments: typeof adminAssessments;
  adminAudit: typeof adminAudit;
  adminContent: typeof adminContent;
  adminMedia: typeof adminMedia;
  adminMembers: typeof adminMembers;
  adminPosts: typeof adminPosts;
  adminThemes: typeof adminThemes;
  adminUsers: typeof adminUsers;
  assessmentAttempts: typeof assessmentAttempts;
  assessmentClone: typeof assessmentClone;
  assessmentCloneRunner: typeof assessmentCloneRunner;
  assessmentMaintenance: typeof assessmentMaintenance;
  assessmentMedia: typeof assessmentMedia;
  assessmentMediaNode: typeof assessmentMediaNode;
  assessmentReviews: typeof assessmentReviews;
  assessmentValidators: typeof assessmentValidators;
  assessments: typeof assessments;
  auth: typeof auth;
  http: typeof http;
  "lib/adminAuth": typeof lib_adminAuth;
  "lib/assessmentAdmin": typeof lib_assessmentAdmin;
  "lib/assessmentAuth": typeof lib_assessmentAuth;
  "lib/assessmentEngine": typeof lib_assessmentEngine;
  "lib/assessmentMedia": typeof lib_assessmentMedia;
  "lib/assessmentModel": typeof lib_assessmentModel;
  "lib/assessmentScoring": typeof lib_assessmentScoring;
  "lib/editorDocument": typeof lib_editorDocument;
  "lib/media": typeof lib_media;
  members: typeof members;
  posts: typeof posts;
  publicThemes: typeof publicThemes;
  r2: typeof r2;
  seed: typeof seed;
  siteContent: typeof siteContent;
  submissions: typeof submissions;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
