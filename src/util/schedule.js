"use strict";

let schedule = module.exports = {};

schedule.parse = function(sched) {
  let cronMatch = sched.match(/^cron\((.*)\)$/);
  if (cronMatch) return cronMatch[1];
  let rateMatch = sched.match(/^rate\((\d+)\s+(\w+)\)/);
  if (!rateMatch) throw new Error("Could not parse schedule: " + sched);
  let unit = rateMatch[2];
  let num = +rateMatch[1];
  return schedule.cronRate(num, unit);
}

const UNITS = ['minute', 'hour', 'day', 'month', 'dayOfWeek', 'year'];

schedule.cronRate = function(num, unit) {
  if (/s$/.test(unit)) unit = unit.substring(0, unit.length - 1);
  let cron = '';
  let set = false;
  UNITS.forEach(nextUnit => {
    if (cron) cron += ' ';
    if (nextUnit === unit) {
      cron += '*/' + num;
      set = true;
    } else if (!set) {
      cron += '0';
    } else {
      cron += '*';
    }
  });
  return cron;
}

schedule.cronToNodeCron = function(cron) {
  let times = cron.split(/\s+/);
  if (times.length === 6) {
    let year = times.pop(); // remove year
    if (year !== '*') throw new Error("Cron expressions with six pieces should use '*' for the year");
  }
  if (times.length !== 5) {
    throw new Error("Cron expressions should have exactly five pieces");
  }
  times.unshift('0'); // add seconds;
  return times.join(' ');
}
