#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";

import { getDirname } from "./util/helper.js";
import { LoginFlow } from "./commands/login.js";
import { addLogin } from "./commands/add-login.js";
import { setCfTarget } from "./commands/set-target.js";
import { removeLogin } from "./commands/remove-login.js";

const packageJson = JSON.parse(
  fs.readFileSync(path.join(getDirname(import.meta.url), "..", "package.json"), {
    encoding: "utf-8",
  }),
) as { name: string; version: string; description: string };

const program = new Command();
program.name(packageJson.name).description(packageJson.description).version(packageJson.version);

program
  .command("login", { isDefault: true })
  .description("Login to Cloud Foundry")
  .action(() => new LoginFlow().run());

program
  .command("t")
  .description("Choose another target (org, space) of current region")
  .action(() => setCfTarget());

program
  .command("add-login")
  .description("Adds new 'pass' Login Id to configstore")
  .action(() => addLogin());

program
  .command("rm-login")
  .description("Removes 'pass' Login from configstore")
  .action(() => removeLogin());

program.parse();
