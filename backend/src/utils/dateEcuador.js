'use strict';

function dateInEcuador() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function yearInEcuador() {
  return Number(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
  }).format(new Date()));
}

function monthInEcuador() {
  return Number(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    month: 'numeric',
  }).format(new Date()));
}

function todayInEcuador() {
  return dateInEcuador();
}

module.exports = { dateInEcuador, yearInEcuador, monthInEcuador, todayInEcuador };
