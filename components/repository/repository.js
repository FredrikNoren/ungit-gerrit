
var components = require('ungit-components');

var repositoryConstructor = components.registered['repository'];
components.register('repository', function(args) {
  var repository = repositoryConstructor(args);
  var repositoryUpdateNode = repository.updateNode.bind(repository);
  var gerrit = components.create('gerrit', { repositoryViewModel: repository });
  repository.updateNode = function(parentElement) {
      var node = document.createElement('div');
      node.className = 'row';
      var gerritNode = document.createElement('div');
      gerritNode.className = 'col-lg-3';
      gerrit.updateNode(gerritNode);
      var repoNode = document.createElement('div');
      repoNode.className = 'col-lg-9';
      repositoryUpdateNode(repoNode);
      node.appendChild(gerritNode);
      node.appendChild(repoNode);
      return node;
    };
  return repository;
});
