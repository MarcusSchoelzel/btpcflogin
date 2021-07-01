#!/usr/bin/env node

import Configstore from "configstore"
import Enquirer from "enquirer"
import clear from "clear"
import chalk from "chalk"
import figlet from "figlet"
import clui from "clui"
import util from "util"
import child_process, { spawnSync } from "child_process"

const exec = util.promisify(child_process.exec)

try {

    clear()
    console.log(chalk.cyanBright(figlet.textSync('SAP BTP CF', { font: "Poison" })))

    const btpRegionCode = (await Enquirer.prompt<{ selection: string }>({
        type: 'select',
        name: 'selection',
        message: 'Choose BTP region',
        initial: 3,
        choices:
            [
                { "name": "ap10", "message": "Australia (Sydney)", "hint": "AWS" },
                { "name": "br10", "message": "Brazil (Sao Paulo)", "hint": "AWS" },
                { "name": "ca10", "message": "Canada (Montreal)", "hint": "AWS" },
                { "name": "eu10", "message": "EU (Frankfurt)", "hint": "AWS" },
                { "name": "eu20", "message": "EU (Netherlands)", "hint": "Azure" },
                { "name": "jp10", "message": "Japan (Tokyo)", "hint": "AWS" },
                { "name": "jp20", "message": "Japan (Tokyo)", "hint": "Azure" },
                { "name": "ap11", "message": "Singapore", "hint": "AWS" },
                { "name": "ap21", "message": "Singapore", "hint": "Azure" },
                { "name": "ap12", "message": "South Korea (Seoul)", "hint": "AWS" },
                { "name": "us10", "message": "US East (Virginia)", "hint": "AWS" },
                { "name": "us21", "message": "US East (Virginia)", "hint": "Azure" },
                { "name": "us20", "message": "US West (Washington)", "hint": "Azure" },
            ]
    })).selection

    const config = new Configstore('btpcflogin')
    if (config.size === 0) {
        throw new Error("Configuration file for pass is missing or empty. Please create a configuration file (~/.config/configstore/btpcflogin.json)!")
    }
    if (!config.has('passLogins')) {
        throw new Error("Configuration file for pass has no property for \"passLogins\". Please create a root property with this name!")
    }
    if (!Array.isArray(config.get('passLogins'))) {
        throw new Error("Property passLogins in configuration file is not of type Array. Please define an Array []!")
    }
    if (config.get('passLogins').length === 0) {
        throw new Error("Array of passLogins is empty. Please add at minimum one entry!")
    }

    const passEntry = (await Enquirer.prompt<{ selection: string }>({
        type: 'select',
        name: 'selection',
        message: 'Choose login user',
        choices: config.get('passLogins')
    })).selection

    const btpCredentials = spawnSync('pass', ['show', passEntry], { stdio: ['inherit', 'pipe', 'pipe'] }).stdout.toString().split("\n")

    const authProgress = new clui.Spinner('Authenticating you, please wait...')
    authProgress.start()
    await exec('cf api api.cf.' + btpRegionCode + '.hana.ondemand.com')
    await exec('cf auth \"' + btpCredentials[1].slice(10) + '\" \"' + btpCredentials[0] + '\"')
    authProgress.stop()

    const cfOrgs = (await exec('cf orgs')).stdout.split("\n").splice(3)
    const cfOrg = (await Enquirer.prompt<{ selection: string }>({
        type: 'select',
        name: 'selection',
        message: 'Choose organisation',
        choices: cfOrgs
    })).selection

    const orgProgress = new clui.Spinner('Switching organisation, please wait...')
    orgProgress.start()
    await exec('cf target -o \"' + cfOrg + '\"')
    orgProgress.stop()

    const cfSpaces = (await exec('cf spaces')).stdout.split("\n").splice(3)
    const cfSpace = (await Enquirer.prompt<{ selection: string }>({
        type: 'select',
        name: 'selection',
        message: 'Choose space',
        choices: cfSpaces
    })).selection

    const spaceProgress = new clui.Spinner('Switching space, please wait...')
    spaceProgress.start()
    await exec('cf target -s \"' + cfSpace + '\"')
    spaceProgress.stop()

    console.log(chalk.cyanBright((await exec('cf t')).stdout))

} catch (error) {
    console.error(error)
}