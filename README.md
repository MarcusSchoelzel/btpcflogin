# SAP BTP Cloud Foundry Login Helper

This Node.js project makes it easier to login to the SAP BTP Cloud Foundry environment with the command line interface `cf` in Linux.
You can find more information and installation instructions about the cf cli at
[https://docs.cloudfoundry.org/cf-cli/install-go-cli.html](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html).

After installation you can use the shell command `btpcflogin` to get a guided login to the platform.

## Installation

This project should run on every Linux platform.
It is implmented and tested with WSL2 - Ubuntu.
Therefore it should run also in headaless environments.

Install as shell command from npm:

`npm i -g btpcflogin`

Run from source:

1. Clone git repo and cd into cloned repo
2. `npm i`
3. `npm run start`

Install as shell command from source:

1. Clone git repo and cd into cloned repo
2. `npm i`
3. `npx tsc`
4. `npm i -g`

## Prerequisites

[Node.js](https://nodejs.org/en/download/package-manager/#nvm) runtime 14 or higher.

A [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installation to clone the repo.

This project uses `pass` as credential store.
To use this login helper you have to [install and setup](https://www.passwordstore.org/) pass in your Linux environment.

You have to tell the helper which pass entries should be used for login.
To do so, you have to create a config file named `btpcflogin.json` in `~/.config/configstore/` with the following structure.
You can specify more than one login inside the array [].
You have to specify the full relative path to the file (as printed by `pass show`).

``` json
{
    "passLogins": [
        "S0123456789",
        "/my-company/cloud/S0123456789"
    ]
}
```

It is assumed that the login data is stored in the following format in a pass file:

``` pass
<password of SAP S-user>
username: <e-mail of SAP S-user>
```

To read the username the first 10 characters of the second line are ignored.

## Bonus

Now that you have setup pass as a secure password manager, you can use it also as a credential store for your git remotes.
Have a look at this project: [languitar/pass-git-helper](https://github.com/languitar/pass-git-helper)
