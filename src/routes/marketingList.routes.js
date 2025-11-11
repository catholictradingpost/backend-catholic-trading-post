import express from "express";
import {
  getMarketingLists,
  createMarketingList,
  updateMarketingList,
  deleteMarketingList,
  getListMembers,
  addListMember,
  removeListMember,
  updateListCount,
  unsubscribeFromMarketing,
} from "../controllers/marketingList.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import { logAdminAction } from "../middlewares/auditLog.middleware.js";

const router = express.Router();

// Admin routes (require authentication and admin role)
router.get(
  "/",
  verifyToken,
  logAdminAction("read", "marketing_list", { resourceType: "MarketingList" }),
  getMarketingLists
);

router.post(
  "/",
  verifyToken,
  logAdminAction("create", "marketing_list", { resourceType: "MarketingList" }),
  createMarketingList
);

router.put(
  "/:id",
  verifyToken,
  logAdminAction("update", "marketing_list", { resourceType: "MarketingList" }),
  updateMarketingList
);

router.delete(
  "/:id",
  verifyToken,
  logAdminAction("delete", "marketing_list", { resourceType: "MarketingList" }),
  deleteMarketingList
);

router.get(
  "/:id/members",
  verifyToken,
  logAdminAction("read", "marketing_list_members", { resourceType: "MarketingList" }),
  getListMembers
);

router.post(
  "/:id/members",
  verifyToken,
  logAdminAction("create", "marketing_list_member", { resourceType: "MarketingList" }),
  addListMember
);

router.delete(
  "/:id/members/:userId",
  verifyToken,
  logAdminAction("delete", "marketing_list_member", { resourceType: "MarketingList" }),
  removeListMember
);

router.post(
  "/:id/update-count",
  verifyToken,
  logAdminAction("update", "marketing_list_count", { resourceType: "MarketingList" }),
  updateListCount
);

// Public unsubscribe route (no auth required)
router.post("/unsubscribe", unsubscribeFromMarketing);

export default router;

