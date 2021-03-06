var UI = require('ui');
var ajax = require('ajax');
var Accel = require('ui/accel');
var Settings = require('settings');

Accel.init();

var host = null;
var playerId = null;

Settings.config(
  { url: 'http://jamarzka.github.io/pebble-kodi-remote/' },
  function(e) {
    if (e.failed) {
      console.log(e.response);
    }
  }
);

var cmdMenuSections = {
  current: null,
  inputCmds: {
    items: [
      { title: 'Select', cmd: 'Input.Select' },
      { title: 'Up', cmd: 'Input.Up' },
      { title: 'Down', cmd: 'Input.Down' },
      { title: 'Left', cmd: 'Input.Left' },
      { title: 'Right', cmd: 'Input.Right' },
      { title: 'Back', cmd: 'Input.Back' },
      { title: 'Home', cmd: 'Input.Home' },
      { title: 'Info', cmd: 'Input.Info' },
      { title: 'Menu', cmd: 'Input.ContextMenu' }
    ]
  },
  playerCmds: {
    items: [
      { title: 'Stop', cmd: 'Player.Stop' },
      { title: 'Play/Pause', cmd: 'Player.PlayPause' },
      { title: 'Forward 10 min', cmd: 'Player.Seek', params: { value: 'bigforward' } },
      { title: 'Backward 10 min', cmd: 'Player.Seek', params: { value: 'bigbackward' } },
      { title: 'Forward 30 sec', cmd: 'Player.Seek', params: { value: 'smallforward' } },
      { title: 'Backward 30 sec', cmd: 'Player.Seek', params: { value: 'smallbackward' } }
    ]
  }
};

var hostMenu = new UI.Menu({
  sections: [{
    title: 'Hosts',
    items: []
  }]
});

var cmdMenu = new UI.Menu();

var hosts = Settings.option('hosts');

if(hosts && hosts.length > 0) {
  for(var i = 0; i < hosts.length; i++) {
    if(hosts[i]) {
      hostMenu.item(0, i, { title: hosts[i].name, ip: hosts[i].ip });
    }
  }

  hostMenu.show();
  
  setInterval(showCmdMenu, 1000);
}
else {
  var errorCard = new UI.Card({
    title:'Error',
    body: 'This app needs to be configured from your phone.'
  });

  errorCard.show();
}

hostMenu.on('select', function(e) {
  host = e.item;

  showCmdMenu();
});

function showCmdMenu() {
  if(host) {
    send(host, { name: 'GetActivePlayers', cmd: 'Player.GetActivePlayers' }, function(data, status, request) {
      var current = cmdMenuSections.current;
      
      if(data.result.length > 0) {
        playerId = data.result[0].playerid;
        cmdMenuSections.current = 'playerCmds';
      }
      else {
        playerId = undefined;
        cmdMenuSections.current = 'inputCmds';
      }

      if(current !== cmdMenuSections.current) {
        cmdMenu._selection = { sectionIndex: 0, itemIndex: 0 };
        cmdMenu.section(0, cmdMenuSections[cmdMenuSections.current]);
        cmdMenu.section(0).title = host.name;
        cmdMenu.show();
      }
    });
  }
}

hostMenu.on('show', function(e) {
  cmdMenuSections.current = null;
  host = null;
});

cmdMenu.on('select', function(e) {
  var cmd = e.item;

  cmd.params = cmd.params || {};

  if(cmdMenuSections.current === 'playerCmds') {
    cmd.params.playerid = playerId;
  }

  send(host, cmd, showCmdMenu);
});

cmdMenu.on('accelTap', function(e) {
  if(cmdMenuSections.current === 'inputCmds') {
    send(host, { name: 'Select', cmd: 'Input.Select' }, showCmdMenu);  
  }
  else if(cmdMenuSections.current === 'playerCmds') {
    send(host, { name: 'Play/Pause', cmd: 'Player.PlayPause', params: { playerid: playerId } }, showCmdMenu);  
  }
});

function send(host, cmd, success) {
  success = success || function(data, status, request) {};

  ajax(
    {
      url: 'http://' + host.ip + '/jsonrpc?' + cmd,
      method: 'post',
      type: 'json',
      data: { "jsonrpc":"2.0", "method": cmd.cmd, "id": 1, params: cmd.params }
    },
    success,
    function(error, status, request) {
      var errorCard = new UI.Card({
        title:'Error',
        body: 'Unable to complete request'
      });

      errorCard.show();
    }
  );
}