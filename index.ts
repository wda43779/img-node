import { randomBytes as randomBytes_ } from "crypto";
import express from "express";
import http2 from "http2";
import SQL from "sql-template-strings";
import sqlite from "sqlite";
import { promisify } from "util";
import multer from "multer";
import sharp from "sharp";
import { promises as fs } from "fs";
import { resolve } from "path";

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }
});

const randomBytes = promisify(randomBytes_);

const app = express();
const port = process.env.PORT || 3004;
const dbPromise = sqlite.open("./database.sqlite");

////////////
// migration
////////////
let adminTokenGlobal: string;
(async () => {
  const db = await dbPromise;
  await db.migrate({});
  let adminToken = await db.get(
    SQL`SELECT * FROM "Meta" WHERE "key"='adminToken'`
  );
  if (!adminToken) {
    const token = await randomBytes(16);
    const tokenBase64 = token.toString("base64");
    await db.get(SQL`INSERT INTO "Meta" VALUES('adminToken', ${tokenBase64})`);
    adminToken = { value: tokenBase64 };
  }
  adminTokenGlobal = adminToken.value;
  console.log(`************************************************************`);
  console.log(`Your admin token is "${adminToken.value}"`);
  console.log(`************************************************************`);
})();

app.get("/", async (req, res, next) => {
  res.contentType("text/html");
  res.send(`
  <h1>IMG-NODE</h1>
  <form action="/" method="post" enctype="multipart/form-data">
  <input type="file" name="image" />
  <input type="submit" />
  </form>
  `);
});

app.post("/", upload.single("image"), async (req, res) => {
  res.send({ success: true, url: "/link/" + req.file.filename });
});

const nan2null = (pram: any) => {
  if (Number.isNaN(pram)) {
    return null;
  }
  return pram;
};

app.get("/link/:hash", async (req, res) => {
  const loaded = await sharp(
    await fs.readFile("./uploads/" + req.params["hash"])
  );
  const format = (await loaded.metadata()).format;
  if (format !== "gif") {
    if (req.accepts("image/webp")) {
      const converted = await loaded
        .resize(
          nan2null(parseInt(req.query.width)),
          nan2null(parseInt(req.query.height))
        )
        .toFormat("webp")
        .toBuffer();
      res.contentType("image/webp");
      res.send(converted);
    } else {
      const converted = await loaded
        .resize(
          nan2null(parseInt(req.query.width)),
          nan2null(parseInt(req.query.height))
        )
        .toFormat("png")
        .toBuffer();
      res.contentType("image/png");
      res.send(converted);
    }
  } else {
    res.contentType("image/gif");
    res.sendFile(resolve("./uploads/" + req.params["hash"]), ".");
  }
});

app.delete("/link/:hash", async (req, res) => {
  //fs.unlink
  if (req.headers["authorization"] === adminTokenGlobal) {
    await fs.unlink(resolve("./uploads/" + req.params["hash"], "."));
    res.send({
      success: true
    });
  } else {
    res.sendStatus(403);
    res.send({
      error: true,
      errorCode: "FORBIDDEN_NEED_ADMIN_CODE"
    });
  }
});

app.listen(port);
