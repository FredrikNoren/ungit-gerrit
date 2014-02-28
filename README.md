Gerrit plugin for Ungit
=======================
Adds a gerrit integration box to Ungit

Installation
------------
1. Go to your ungit plugin dir (defaults to ~/.ungit/plugins, create it if it doesn't exsist).
2. `git clone https://github.com/FredrikNoren/ungit-gerrit.git`
3. `npm install` in the ungit-gerrit folder
4. Restart Ungit

Configuration
-------------
In your `.ungitrc`:

    {
      "pluginConfigs": {
        "gerrit": {

          // Ssh username. Defaults to what the repository is configured with, or the currently logged in user.
          "sshUsername": undefined,

          // Ssh agent. Defaults to pageant on Windows and SSH_AUTH_SOCK on Unix.
          sshAgent: undefined,

        }
      }
    }
