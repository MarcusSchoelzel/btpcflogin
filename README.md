# SAP BTP Cloud Foundry Login Helper

This Node.js project makes it easier to login to the SAP BTP Cloud Foundry environment with the command line interface `cf`.
You can find more information and installation instructions about the cf cli at
[https://docs.cloudfoundry.org/cf-cli/install-go-cli.html](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html).

After installation you can use the shell command `btpcflogin` to get a guided login to the platform.

## Installation

This project should run on every Linux platform.
It is implemented and tested with WSL2 - Ubuntu.
Therefore it should run also in headless environments.

Install as shell command from npm:

`npm i -g btpcflogin`

Run from source:

1. Clone git repo and cd into cloned repo
2. `npm i`
3. `npm run local`

Install as shell command from source:

1. Clone git repo and cd into cloned repo
2. `npm i`
3. `npx tsc`
4. `npm i -g`

## Available Commands

- `login` (default)  
  Starts complete Login to Cloud Foundry. As this is the default command it can be ommitted and is triggered by executing `btpcflogin`.

  Options:

  - `-s, --store-favorite`  
    Stores the cf target after successful login in the config store

  - `-f, --use-favorite`  
    Use stored favorite to login event faster

- `add-login`  
  Interactively adds new `pass`/`gopass` login to the config store

- `rm-login`  
  Interactively removes `pass`/`gopass` login from the config store

- `sort-logins`  
  Allows reordering of the stored `pass`/`gopass` logins in the config store

- `t` (target)  
  Interactive setting of new target (org and space), by using the current API region and logon token. (see `cf t`)

- `sort-favs`  
  Allows reordering of the stored favorites in the config store

- `rm-fav`  
  Remove single cf target favorite from the config store
  
### Example calls

```sh
# Login
btpcflogin

# Login and store the chosen org, space, api region and pass login into favorite
btpcflogin -s

# choose target
btpcflogin t

# Add new 'pass' login
btpcflogin add-login
```

## Prerequisites

[Node.js](https://nodejs.org/en/download/package-manager/#nvm) runtime 14 or higher.

A [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installation to clone the repo.

### Credential manager installation

To use login credentials besides the SSO option that is provided by the Cloud Foundry CLI, a credential manager needs to be installed.

| Platform | Manager                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| Linux    | `pass` - the standard linux password manager ([install and setup](https://www.passwordstore.org/))                    |
| Windows  | `gopass` - cross-platform password manager that is compatible to `pass` ([install and setup](https://www.gopass.pw/)) |

## Credential format

It is assumed that the login data is stored in the following format in a pass file:

``` pass
<password of SAP S-user>
username: <e-mail of SAP S-user>
origin: <origin or custom IdP>
```

**Hint**: The origin is only required if the credentials are from a custom identity provider.

To read the username the first 10 characters of the second line are ignored.

## Bonus

Now that you have setup pass as a secure password manager, you can use it also as a credential store for your git remotes.
Have a look at this project: [languitar/pass-git-helper](https://github.com/languitar/pass-git-helper)
