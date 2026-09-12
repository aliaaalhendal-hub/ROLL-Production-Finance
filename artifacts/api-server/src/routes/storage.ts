import { Router, Request } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const storageService = new ObjectStorageService();

router.post("/storage/upload-url", requireAuth(), async (req: Request, res) => {
  try {
    const uploadUrl = await storageService.getObjectEntityUploadURL();
    const normalized = storageService.normalizeObjectEntityPath(uploadUrl);
    res.json({ uploadUrl, normalizedPath: normalized });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.post("/storage/finalize", requireAuth(), async (req: Request, res) => {
  try {
    const { normalizedPath } = req.body;
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId || !normalizedPath) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    await storageService.trySetObjectEntityAclPolicy(normalizedPath, {
      owner: userId,
      visibility: 'private',
      aclRules: []
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to finalize upload" });
  }
});

router.get("/objects/*objectPath", requireAuth(), async (req: Request, res) => {
  try {
    const objectFile = await storageService.getObjectEntityFile(req.path);
    const auth = getAuth(req);
    const userId = auth?.userId ?? undefined;
    const canAccess = await storageService.canAccessObjectEntity({ userId, objectFile });
    if (!canAccess) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const response = await storageService.downloadObject(objectFile);
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    const stream = response.body as any; // ReadableStream
    // convert Web ReadableStream to Node stream
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error) {
    console.error(error);
    res.status(404).json({ error: "Not found" });
  }
});

export default router;
