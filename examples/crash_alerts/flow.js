const datafire = require('datafire');
const flow = module.exports = new datafire.Flow("Crashed Process Alerts", "Send an email if any Heroku processes have crashed");
const heroku = datafire.Integration.new('heroku').as('default');
const slack = datafire.Integration.new('slack').as('default');

flow.step('heroku', {
  do: heroku.get("/apps"),
  params: () => {
    return {}
  }
})

flow.step('heroku1', {
  do: heroku.get("/apps/{app}/ps"),
  params: (data) => {
    return data.heroku.map(function(app) {
      return {
        Accept: 'application/json',
        app: app.name,
      }
    })
  }
})

flow.step('slack', {
  do: slack.get('/chat.postMessage'),
  params: (data) => {
    var allProcesses = [];
    data.heroku1.forEach(function(processes) {
      allProcesses = allProcesses.concat(processes)
    })
    var crashed = allProcesses.filter(function(process) {
      return process.state === 'crashed';
    })
    if (!crashed.length) return [];

    return {
      body: {
        channel: flow.params.channel,
        text: 'Crashed processes: ' + crashed.map(p => p.app_name + ' - ' + p.command).join(', '),
      }
    }
  }
})
