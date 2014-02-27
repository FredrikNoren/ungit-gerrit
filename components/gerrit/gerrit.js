
var ko = require('knockout');
var _ = require('lodash');


var components = require('ungit-components');

components.register('gerrit', function(args) {
  return new GerritIntegrationViewModel(args.repositoryViewModel);
});

var GerritIntegrationViewModel = function(repository) {
  this.repository = repository;
  this.server = repository.server;
  this.showInitCommmitHook = ko.observable(false);
  this.status = ko.observable('loading');
  this.initGerritHookProgressBar = components.create('progressBar', {
    predictionMemoryKey: 'gerrit-init-hook-' + repository.repoPath,
    fallbackPredictedTimeMs: 4000,
    temporary: true
  });
  this.changesLoader = components.create('progressBar', {
    predictionMemoryKey: 'gerrit-changes-' + repository.repoPath,
    fallbackPredictedTimeMs: 4000
  });
  this.pushingProgressBar = components.create('progressBar', {
    predictionMemoryKey: 'gerrit-push-' + repository.repoPath,
    fallbackPredictedTimeMs: 4000,
    temporary: true
  });
  this.changes = ko.observable();
  this.updateCommitHook();
  this.updateChanges();
}

GerritIntegrationViewModel.prototype.updateNode = function(parentElement) {
  ko.renderTemplate('gerrit', this, {}, parentElement);
}

GerritIntegrationViewModel.prototype.updateCommitHook = function() {
  var self = this;
  this.server.get('/plugins/gerrit/commithook', { path: this.repository.repoPath }, function(err, hook) {
    self.showInitCommmitHook(!hook.exists);
  });
}
GerritIntegrationViewModel.prototype.updateChanges = function() {
  var self = this;
  self.status('loading');
  this.changesLoader.start();
  this.server.get('/plugins/gerrit/changes', { path: this.repository.repoPath }, function(err, changes) {
    self.changesLoader.stop();
    if (err) {
      self.status('failed');
      return true;
    }
    self.changes(changes.slice(0, changes.length - 1).map(function(c) { return new GerritChangeViewModel(self, c); }));
    self.status('loaded');
  });
}
GerritIntegrationViewModel.prototype.initCommitHook = function() {
  var self = this;
  this.initGerritHookProgressBar.start();
  this.server.post('/plugins/gerrit/commithook', { path: this.repository.repoPath }, function(err) {
    self.updateCommitHook();
    self.initGerritHookProgressBar.stop();
  });
}
GerritIntegrationViewModel.prototype.getChange = function(changeId) {
  return _.find(this.changes(), { data: { id: changeId } });
}
GerritIntegrationViewModel.prototype.getChangeIdFromMessage = function(message) {
  var changeId = message.split('\n').pop().trim();
  if (changeId && changeId.indexOf('Change-Id: ') == 0) {
    return changeId.slice('Change-Id: '.length).trim();
  }
}
GerritIntegrationViewModel.prototype.getChangeFromNode = function(node) {
  var changeId = this.getChangeIdFromMessage(node.message());
  if (!changeId) return;
  return this.getChange(changeId);
}
GerritIntegrationViewModel.prototype.pushForReview = function() {
  var self = this;
  this.pushingProgressBar.start();
  var branch = this.repository.graph.checkedOutBranch();
  var change = this.getChangeFromNode(this.repository.graph.HEAD());
  if (change) branch = change.data.branch;

  this.server.post('/push', { path: this.repository.graph.repoPath, remote: this.repository.remotes.currentRemote(), remoteBranch: 'refs/for/' + branch }, function(err, res) {
    self.updateChanges();
    self.pushingProgressBar.stop();
  });
}

var GerritChangeViewModel = function(gerritIntegration, args) {
  this.gerritIntegration = gerritIntegration;
  this.repository = gerritIntegration.repository;
  this.server = gerritIntegration.server;
  this.subject = args.subject;
  this.ownerName = args.owner.name;
  this.sha1 = args.sha1;
  this.data = args;
  this.gerritUrl = this.data.url;
  this.checkingOutProgressBar = components.create('progressBar', {
    predictionMemoryKey: 'gerrit-checkout-' + repository.repoPath,
    fallbackPredictedTimeMs: 4000,
    temporary: true
  });
  this.cherryPickingProgressBar = components.create('progressBar', {
    predictionMemoryKey: 'gerrit-cherry-pick-' + repository.repoPath,
    fallbackPredictedTimeMs: 4000,
    temporary: true
  });
};
GerritChangeViewModel.prototype.checkout = function() {
  var self = this;
  this.checkingOutProgressBar.start();
  this.server.post('/fetch', { path: this.gerritIntegration.repository.repoPath, remote: self.gerritIntegration.repository.remotes.currentRemote(), ref: this.data.currentPatchSet.ref }, function(err) {
    self.server.post('/checkout', { path: self.gerritIntegration.repository.repoPath, name: 'FETCH_HEAD' }, function(err) {
      self.checkingOutProgressBar.stop();
    });
  });
}
GerritChangeViewModel.prototype.cherryPick = function() {
  var self = this;
  this.cherryPickingProgressBar.start();
  this.server.post('/fetch', { path: this.gerritIntegration.repository.repoPath, remote: self.gerritIntegration.repository.remotes.currentRemote(), ref: this.data.currentPatchSet.ref }, function(err) {
    self.server.post('/cherrypick', { path: self.gerritIntegration.repository.repoPath, name: 'FETCH_HEAD' }, function(err) {
      self.cherryPickingProgressBar.stop();
    });
  });
}


