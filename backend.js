
var fs = require('fs');
var gerrit = require('./gerrit');
var os = require('os');
var child_process = require('child_process');
var path = require('path');


function ensurePathExists(req, res, next) {
  var path = req.param('path');
  if (!fs.existsSync(path)) {
    res.json(400, { error: 'No such path: ' + path, errorCode: 'no-such-path' });
  } else {
    next();
  }
}

exports.install = function(env) {
    var app = env.app;
    var ensureAuthenticated = env.ensureAuthenticated;
    var git = env.git;

    app.get(env.httpPath + '/commithook', ensureAuthenticated, ensurePathExists, function(req, res) {
      var repoPath = req.param('path');
      var hookPath = path.join(repoPath, '.git', 'hooks', 'commit-msg');
      if (fs.existsSync(hookPath)) res.json({ exists: true });
      else res.json({ exists: false });
    });

    app.post(env.httpPath + '/commithook', ensureAuthenticated, ensurePathExists, function(req, res) {
      var repoPath = req.param('path');
      git.getRemoteAddress(repoPath, 'origin')
        .fail(function(err) {
          res.json(400, err);
        })
        .done(function(remote) {
          if (!remote.host) throw new Error("Failed to parse host from: " + remote.address);
          var command = 'scp -p ';
          if (remote.port) command += ' -P ' + remote.port + ' ';
          command += remote.host + ':hooks/commit-msg .git/hooks/';
          var hooksPath = path.join(repoPath, '.git', 'hooks');
          if (!fs.existsSync(hooksPath)) fs.mkdirSync(hooksPath);
          child_process.exec(command, { cwd: repoPath },
            function (err, stdout, stderr) {
              if (err) return res.json(400, { error: err, stdout: stdout, stderr: stderr });
              res.json({});
            });
        });
    });

    app.get(env.httpPath + '/changes', ensureAuthenticated, ensurePathExists, function(req, res) {
      var repoPath = req.param('path');
      git.getRemoteAddress(repoPath, 'origin')
        .fail(function(err) {
          res.json(400, err);
        })
        .done(function(remote) {
          if (!remote.host) throw new Error("Failed to parse host from: " + remote.address);
          var command = 'query --format=JSON --current-patch-set status:open project:' + remote.project + '';
          var sshConfig = {
            host: remote.host,
            port: remote.port,
            username: remote.username || env.pluginConfig.sshUsername,
            agent: env.pluginConfig.sshAgent,
          }
          if (!sshConfig.agent) {
            if (os.type() == 'Windows_NT') sshConfig.agent = 'pageant';
            else sshConfig.agent = '' + process.env.SSH_AUTH_SOCK;
          }
          gerrit(sshConfig, command, res, function(err, result) {
            if (err || result.indexOf('Invalid command') != -1) 
              return res.json(400, err || { error: result });
            result = result.split('\n').filter(function(r) { return r.trim(); });
            result = result.map(function(r) { return JSON.parse(r); });
            res.json(result);
          });
        });
    });

}