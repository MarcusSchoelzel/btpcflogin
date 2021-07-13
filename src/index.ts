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
        // https://help.sap.com/viewer/65de2977205c403bbc107264b8eccf4b/LATEST/en-US/350356d1dc314d3199dca15bd2ab9b0e.html
        message: 'Choose BTP Cloud Foundry region',
        initial: 7,
        choices:
            [
                { "name": "ap11", "message": "ap11 - Asia Pacific (Singapore)", "hint": "Amazon Web Services" },
                { "name": "ap12", "message": "ap12 - Asia Pacific (Seoul) ", "hint": "Amazon Web Services" },
                { "name": "ap10", "message": "ap10 - Australia (Sydney)", "hint": "Amazon Web Services" },
                { "name": "ap20", "message": "ap20 - Australia (Sydney)", "hint": "Microsoft Azure" },
                { "name": "br10", "message": "br10 - Brazil (São Paulo)", "hint": "Amazon Web Services" },
                { "name": "ca10", "message": "ca10 - Canada (Montreal)", "hint": "Amazon Web Services" },
                { "name": "cn40", "message": "cn40 - China (Shanghai)", "hint": "Alibaba Cloud" },
                { "name": "eu10", "message": "eu10 - Europe (Frankfurt)", "hint": "Amazon Web Services" },
                { "name": "eu11", "message": "eu11 - Europe (Frankfurt)", "hint": "Amazon Web Services" },
                { "name": "eu20", "message": "eu20 - Europe (Netherlands)", "hint": "Microsoft Azure" },
                { "name": "jp10", "message": "jp10 - Japan (Tokyo)", "hint": "Amazon Web Services" },
                { "name": "jp20", "message": "jp20 - Japan (Tokyo)", "hint": "Microsoft Azure" },
                { "name": "ap21", "message": "ap21 - Singapore", "hint": "Microsoft Azure" },
                { "name": "us10", "message": "us10 - US East (VA)", "hint": "Amazon Web Services" },
                { "name": "us21", "message": "us21 - US East (VA)", "hint": "Microsoft Azure" },
                { "name": "us20", "message": "us20 - US West (WA)", "hint": "Microsoft Azure" },
                { "name": "us30", "message": "us30 - US Central (IA)", "hint": "Google Cloud Platform" }
            ]
    })).selection
    const btpRegionDomain = btpRegionCode + ((btpRegionCode === 'cn40') ? '.platform.sapcloud.cn' : '.hana.ondemand.com')

    const apiProgress = new clui.Spinner('Switching region, please wait...')
    apiProgress.start()
    try {
        await exec('cf api api.cf.' + btpRegionDomain)
    } catch (error) {
        if (error.stderr) {
            throw error.stderr
        } else {
            throw error
        }
    } finally {
        apiProgress.stop()
    }
    apiProgress.stop()

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
    try {
        await exec('cf auth \"' + btpCredentials[1].slice(10) + '\" \"' + btpCredentials[0] + '\"')
    } catch (error) {
        let errorObj = JSON.parse(error.stderr);
        if (errorObj.error === 'invalid_grant') {
            throw errorObj.error_description
        } else {
            throw error
        }
    } finally {
        authProgress.stop()
    }
    authProgress.stop()

    let cfOrgs = (await exec('cf orgs')).stdout.split("\n")
    if (cfOrgs[2] === 'No orgs found.') {
        console.log(chalk.yellowBright(cfOrgs[2]))
    } else {
        cfOrgs = cfOrgs.splice(3, cfOrgs.length - 4)

        const cfOrg = (await Enquirer.prompt<{ selection: string }>({
            type: 'select',
            name: 'selection',
            message: 'Choose organisation',
            choices: cfOrgs
        })).selection

        const orgProgress = new clui.Spinner('Switching organisation, please wait...')
        orgProgress.start()
        try {
            await exec('cf target -o \"' + cfOrg + '\"')
        } finally {
            orgProgress.stop()
        }
        orgProgress.stop()

        let cfSpaces = (await exec('cf spaces')).stdout.split("\n")
        if (cfSpaces[2] === 'No spaces found.') {
            console.log(chalk.yellowBright(cfSpaces[2]))
        } else {
            cfSpaces = cfSpaces.splice(3, cfSpaces.length - 4)

            const cfSpace = (await Enquirer.prompt<{ selection: string }>({
                type: 'select',
                name: 'selection',
                message: 'Choose space',
                choices: cfSpaces
            })).selection

            const spaceProgress = new clui.Spinner('Switching space, please wait...')
            spaceProgress.start()
            try {
                await exec('cf target -s \"' + cfSpace + '\"')
            } finally {
                spaceProgress.stop()
            }
            spaceProgress.stop()
        }
    }

    console.log(chalk.cyanBright((await exec('cf t')).stdout))

} catch (error) {
    console.error(chalk.redBright(error))
}