-- Up
CREATE TABLE "Meta" (
	"key"	TEXT,
	"value"	TEXT,
	PRIMARY KEY("key")
);
INSERT INTO "main"."Meta" ("key", "value") VALUES ('version', '1');

-- Down
DROP TABLE "Meta";
DROP TABLE "Link";
