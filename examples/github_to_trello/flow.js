const datafire = require('datafire');
const flow = module.exports = new datafire.Flow("Sync GitHub Issues to Trello", "Create a Trello list for every Milestone, and a card for every Issue");
const trello = datafire.Integration.new('trello').as('default');
const github = datafire.Integration.new('github');

flow.step('trello', {
  do: trello.get("/members/{idMember}/boards"),
  params: () => {
    return {idMember: 'me'}
  }
})

flow.step('github', {
  do: github.get("/repos/{owner}/{repo}/issues"),
  params: (data) => {
    var pages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return pages.map(function(p) {
      return {
        owner: flow.params.owner,
        repo: flow.params.repo,
        state: 'open',
        page: p,
      }
    })
  }
})

flow.step('trello1', {
  do: trello.get("/boards/{idBoard}/cards"),
  params: (data) => {
    var board = data.trello.filter(function(b) {
      return b.name === flow.params.board || b.id === flow.params.board;
    })[0];
    if (!board) throw new Error("Could not find board " + flow.params.board)
    return {
      idBoard: board.id,
      filter: 'open',
    }
  }
})

flow.step('trello2', {
  do: trello.get("/boards/{idBoard}/lists"),
  params: (data) => {
    var board = data.trello.filter(function(b) {
      return b.name === flow.params.board || b.id === flow.params.board;
    })[0];
    return {
      idBoard: board.id,
    }
  }
})

flow.step('github1', {
  do: github.get("/repos/{owner}/{repo}/milestones"),
  params: (data) => {
    return {
      owner: flow.params.owner,
      repo: flow.params.repo,
    }
  }
})

flow.step('trello3', {
  do: trello.post("/lists"),
  params: (data) => {
    var board = data.trello.filter(function(b) {
      return b.name === flow.params.board || b.id === flow.params.board;
    })[0];
    var listsInTrello = data.trello2.map(function(list) {return list.name})
    var milestones = data.github1;
    milestones.push({title: 'None'})
    var newMilestones = milestones.filter(function(m) {
      return listsInTrello.indexOf('Milestone: ' + m.title) === -1;
    })
    return newMilestones.map(function(m) {
      return {
        body: {
          idBoard: board.id,
          name: 'Milestone: ' + m.title,
        }
      }
    });
  }
})

flow.step('trello4', {
  do: trello.post("/cards"),
  params: (data) => {
    var board = data.trello.filter(function(b) {
      return b.name === flow.params.board || b.id === flow.params.board;
    })[0];
    var descriptions = data.trello1.map(function(card) {return card.desc})
    var issues = [];
    data.github.forEach(function(page) {issues = issues.concat(page)});
    var newIssues = issues.filter(function(i) {
      return descriptions.indexOf('GitHub Issue ' + i.number) === -1;
    })
    var allLists = data.trello2.concat(data.trello3);
    return newIssues.map(function(i) {
      var list = allLists.filter(function(list) {
        return (list.name === 'Milestone: None' && !i.milestone) || (i.milestone && list.name === 'Milestone: ' + i.milestone.title)
      })[0]
      return {
        body: {
          idBoard: board.id,
          idList: list.id,
          desc: 'GitHub Issue ' + i.number,
          name: i.title,
        }
      }
    })
  }
})

flow.step('trello5', {
  do: trello.put("/cards/{idCard}/closed"),
  params: (data) => {
    var issues = [];
    data.github.forEach(function(page) {issues = issues.concat(page)});
    var openIssues = issues.map(function(i) {
      return 'GitHub Issue ' + i.number;
    })
    var closedCards = data.trello1.filter(function(card) {
      return openIssues.indexOf(card.desc) === -1;
    })
    return closedCards.map(function(card) {
      return {
        idCard: card.id,
        body: {value: true},
      }
    })
  }
})
