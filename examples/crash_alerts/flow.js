const datafire = require('datafire');
const flow = module.exports = new datafire.Flow("Crashed Process Alerts", "Send an email if any Heroku processes have crashed");
const heroku = datafire.Integration.new('heroku').as('default');
const slack = datafire.Integration.new('slack').as('default');

flow.step('apps', {
  do: heroku.get("/apps"),
})

flow.step('app_status', {
  do: heroku.get("/apps/{app}/ps"),
  params: (data) => {
    return data.apps.map(function(app) {
      return {
        Accept: 'application/json',
        app: app.name,
      }
    })
  }
})

flow.step('channels', {
  do: slack.get('/channels.list'),
  finish: data => {
    console.log('c', data.channels);
    data.channel = data.channels.channels.filter(c => {
      return c.name === flow.params.channel || c.id === flow.params.channel;
    })[0];
    if (!data.channel) throw new Error("Channel " + flow.params.channel + " not found");
  }
})

flow.step('slack', {
  do: slack.get('/chat.postMessage'),
  params: (data) => {
    var allProcesses = [];
    data.app_status.forEach(function(processes) {
      allProcesses = allProcesses.concat(processes)
    })
    var crashed = allProcesses.filter(function(process) {
      return process.state === 'crashed';
    })
    if (!crashed.length) return [];

    return {
      channel: flow.params.channel,
      text: 'Crashed processes: ' + crashed.map(p => p.app_name + ' - ' + p.command).join(', '),
    }
  }
})
