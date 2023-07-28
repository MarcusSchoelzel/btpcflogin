#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";

import { cfLogin } from "./commands/login.js";
import { setCfTarget } from "./util/target-selection.js";
import { getDirname } from "./util/helper.js";
import { addLogin } from "./commands/add-login.js";
import { addOrigin } from "./commands/add-origin.js";

const packageJson = JSON.parse(
  fs.readFileSync(path.join(getDirname(import.meta.url), "..", "package.json"), {
    encoding: "utf-8"
  })
) as { name: string; version: string; description: string };

const program = new Command();
program.name(packageJson.name).description(packageJson.description).version(packageJson.version);

program
  .command("login", { isDefault: true })
  .description("Login to Cloud Foundry")
  .action(() => cfLogin());

program
  .command("t")
  .description("Choose another target (org, space) of current region")
  .action(() => setCfTarget());

program
  .command("add-origin")
  .description("Adds new origin (identifier for identity provider, e.g. a1d37dasn-platform) to configstore")
  .action(() => addOrigin());

program
  .command("add-login")
  .description("Adds new 'pass' Login Id to configstore")
  .action(() => addLogin());

program.parse();
