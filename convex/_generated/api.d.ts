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
import type * as adminAssessmentPools from "../adminAssessmentPools.js";
import type * as adminAssessmentQuestionBank from "../adminAssessmentQuestionBank.js";
import type * as adminAssessments from "../adminAssessments.js";
import type * as adminAudit from "../adminAudit.js";
import type * as adminContent from "../adminContent.js";
import type * as adminMedia from "../adminMedia.js";
import type * as adminMemberDivisions from "../adminMemberDivisions.js";
import type * as adminMembers from "../adminMembers.js";
import type * as adminPosts from "../adminPosts.js";
import type * as adminPrograms from "../adminPrograms.js";
import type * as adminProvisioning from "../adminProvisioning.js";
import type * as adminSubmissions from "../adminSubmissions.js";
import type * as adminThemes from "../adminThemes.js";
import type * as adminUsers from "../adminUsers.js";
import type * as assessmentAttempts from "../assessmentAttempts.js";
import type * as assessmentClone from "../assessmentClone.js";
import type * as assessmentCloneRunner from "../assessmentCloneRunner.js";
import type * as assessmentMaintenance from "../assessmentMaintenance.js";
import type * as assessmentMedia from "../assessmentMedia.js";
import type * as assessmentMediaNode from "../assessmentMediaNode.js";
import type * as assessmentResultDelivery from "../assessmentResultDelivery.js";
import type * as assessmentResultEmail from "../assessmentResultEmail.js";
import type * as assessmentReviews from "../assessmentReviews.js";
import type * as assessmentSeed from "../assessmentSeed.js";
import type * as assessmentValidators from "../assessmentValidators.js";
import type * as assessments from "../assessments.js";
import type * as assets_geistRegularBase64 from "../assets/geistRegularBase64.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as developmentSeed from "../developmentSeed.js";
import type * as http from "../http.js";
import type * as lib_adminAuth from "../lib/adminAuth.js";
import type * as lib_assessmentAdmin from "../lib/assessmentAdmin.js";
import type * as lib_assessmentAuth from "../lib/assessmentAuth.js";
import type * as lib_assessmentEngine from "../lib/assessmentEngine.js";
import type * as lib_assessmentEstimate from "../lib/assessmentEstimate.js";
import type * as lib_assessmentMedia from "../lib/assessmentMedia.js";
import type * as lib_assessmentModel from "../lib/assessmentModel.js";
import type * as lib_assessmentPaperEstimate from "../lib/assessmentPaperEstimate.js";
import type * as lib_assessmentQuestionBank from "../lib/assessmentQuestionBank.js";
import type * as lib_assessmentQuestionSignals from "../lib/assessmentQuestionSignals.js";
import type * as lib_assessmentResult from "../lib/assessmentResult.js";
import type * as lib_assessmentReview from "../lib/assessmentReview.js";
import type * as lib_assessmentScoring from "../lib/assessmentScoring.js";
import type * as lib_editorDocument from "../lib/editorDocument.js";
import type * as lib_fullPracticeCertificate from "../lib/fullPracticeCertificate.js";
import type * as lib_fullPracticeEmail from "../lib/fullPracticeEmail.js";
import type * as lib_media from "../lib/media.js";
import type * as lib_passwordCrypto from "../lib/passwordCrypto.js";
import type * as lib_passwordPolicy from "../lib/passwordPolicy.js";
import type * as lib_resultDeliverySecurity from "../lib/resultDeliverySecurity.js";
import type * as members from "../members.js";
import type * as posts from "../posts.js";
import type * as programs from "../programs.js";
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
  adminAssessmentPools: typeof adminAssessmentPools;
  adminAssessmentQuestionBank: typeof adminAssessmentQuestionBank;
  adminAssessments: typeof adminAssessments;
  adminAudit: typeof adminAudit;
  adminContent: typeof adminContent;
  adminMedia: typeof adminMedia;
  adminMemberDivisions: typeof adminMemberDivisions;
  adminMembers: typeof adminMembers;
  adminPosts: typeof adminPosts;
  adminPrograms: typeof adminPrograms;
  adminProvisioning: typeof adminProvisioning;
  adminSubmissions: typeof adminSubmissions;
  adminThemes: typeof adminThemes;
  adminUsers: typeof adminUsers;
  assessmentAttempts: typeof assessmentAttempts;
  assessmentClone: typeof assessmentClone;
  assessmentCloneRunner: typeof assessmentCloneRunner;
  assessmentMaintenance: typeof assessmentMaintenance;
  assessmentMedia: typeof assessmentMedia;
  assessmentMediaNode: typeof assessmentMediaNode;
  assessmentResultDelivery: typeof assessmentResultDelivery;
  assessmentResultEmail: typeof assessmentResultEmail;
  assessmentReviews: typeof assessmentReviews;
  assessmentSeed: typeof assessmentSeed;
  assessmentValidators: typeof assessmentValidators;
  assessments: typeof assessments;
  "assets/geistRegularBase64": typeof assets_geistRegularBase64;
  auth: typeof auth;
  crons: typeof crons;
  developmentSeed: typeof developmentSeed;
  http: typeof http;
  "lib/adminAuth": typeof lib_adminAuth;
  "lib/assessmentAdmin": typeof lib_assessmentAdmin;
  "lib/assessmentAuth": typeof lib_assessmentAuth;
  "lib/assessmentEngine": typeof lib_assessmentEngine;
  "lib/assessmentEstimate": typeof lib_assessmentEstimate;
  "lib/assessmentMedia": typeof lib_assessmentMedia;
  "lib/assessmentModel": typeof lib_assessmentModel;
  "lib/assessmentPaperEstimate": typeof lib_assessmentPaperEstimate;
  "lib/assessmentQuestionBank": typeof lib_assessmentQuestionBank;
  "lib/assessmentQuestionSignals": typeof lib_assessmentQuestionSignals;
  "lib/assessmentResult": typeof lib_assessmentResult;
  "lib/assessmentReview": typeof lib_assessmentReview;
  "lib/assessmentScoring": typeof lib_assessmentScoring;
  "lib/editorDocument": typeof lib_editorDocument;
  "lib/fullPracticeCertificate": typeof lib_fullPracticeCertificate;
  "lib/fullPracticeEmail": typeof lib_fullPracticeEmail;
  "lib/media": typeof lib_media;
  "lib/passwordCrypto": typeof lib_passwordCrypto;
  "lib/passwordPolicy": typeof lib_passwordPolicy;
  "lib/resultDeliverySecurity": typeof lib_resultDeliverySecurity;
  members: typeof members;
  posts: typeof posts;
  programs: typeof programs;
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
