class SampleWebrtcPlanningPorkerApp {
  get roomMode() { return { mesh: 'mesh', sfu: 'sfu' }; }
  get cardValues() { return [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233]; }
 
  start() {
    this.el = {
      $selfStateArea    : $('.self-state-area'),
      $selfNameArea     : $('.self-name-area'),
      $disableOnConnect : $('.disable-on-connect'),
      $connectedArea    : $('.connected-area'),
      $apiKeyArea       : $('.api-key-area'),
      $roomNameArea     : $('.room-name-area'),
      $tboxMsg          : $('#tbox-msg'),
      $tboxDispName     : $('#tbox-disp-name'),
      $tboxApiKey       : $('#tbox-api-key'),
      $tboxRoomName     : $('#tbox-room-name'),
      $btnConnect       : $('#btn-connect'),
      $btnDisconnect    : $('#btn-disconnect'),
      $chatArea         : $('#chat-area'),
      $chatAreaContainer: $('#chat-area').closest('.chat-area-container'),
      $cardArea         : $('#card-area'),
      $cardAreaContainer: $('#card-area').closest('.card-area-container'),
      $putCardArea      : $('footer .put-card-area')
    };

    // set default values.
    this.setDefaults();

    // create card buttons.
    this.el.$putCardArea.append(this.cardValues.map((cv) => $(`
      <button class="waves-effect waves-light btn blue block" onclick="app.putCard('${cv}')">
        <i class="material-icons left">publish</i>${cv}
      </button>
    `)));

    /* window resize event */ {
      let timer = false;
      $(window).resize(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.el.$chatAreaContainer
          .add(this.el.$cardAreaContainer)
          .css('max-height', ($(window).height() * 0.75 ));
        }, 200);
      }).resize();
    }
  }

  /** create peer connection. */
  connect() {
    this.peer = new Peer({ key: this.apiKey });
    this.peer.on('open', (id) => this.onPeerOpen(id));
  }

  disconnect() {
    if (!this.room) { return; }

    this.room.close();
    this.room = undefined;
    this.peer = undefined;
  }

  onPeerOpen() {
    this.room = this.peer.joinRoom(this.roomName, { mode: this.roomMode.sfu });
    this.room.on('open'     , ()       => this.onRoomOpen());
    this.room.on('close'    , ()       => this.onRoomClose());
    this.room.on('data'     , (obj)    => this.onReceiveData(obj));
    this.room.on('peerJoin' , (peerId) => this.onPeerJoin(peerId));
    this.room.on('peerLeave', (peerId) => this.onPeerLeave(peerId));
    this.room.on('log'      , (logs)   => this.onReceiveLog(logs));
  }

  onRoomOpen() {
    this.toast('connected.');
    this.applyConnected(true);
    // Get room log.
    this.room.getLog();
    // Notify your name to other member.
    this.notifyName(this.dispName);
  }

  onRoomClose() {
    this.toast('closed.');
    this.applyConnected(false);
  }

  onReceiveData(obj) {
    console.log(obj);
    // pass the data to each functions.
    const id   = obj.src;
    const data = obj.data;
    this.receiveMessage   (id, data);
    this.receivePutCard   (id, data);
    this.receivePullCard  (id, data);
    this.receiveFaceup    (id, data);
    this.receiveFacedown  (id, data);
    this.receiveNotifyName(id, data);
    // Remember room member's name.
    this.memorizeName(id, data);
  }

  onReceiveLog(logs) {
    if (!Array.isArray(logs)) { return; }

    logs.forEach((raw) => {
      const log = JSON.parse(raw);
      if (log.messageType === 'ROOM_DATA') {
        // Remember room member's name from log.
        this.memorizeName(log.message.src, log.message.data);
      }
    });
  }

  onPeerJoin(peerId) {
    console.log(peerId, 'joined.');
  }

  onPeerLeave(peerId) {
    console.log(peerId, 'leaved.');

    // Popup leaved member's name.
    const members = this.members || {};
    const leaverName = members[peerId] || `Someone(${peerId})`;
    this.toast(`${leaverName} leaved.`);

    // Delete the leaved member's card.
    this.receivePullCard(peerId, { pullCard: true });
  }

  toast(message = '', displayLength = 3000) {
    Materialize.toast(message, displayLength);
  }

  getRandomName() {
    const names = ['Jobs', 'Gates', 'Larry', 'Jeff', 'Alan', 'Dennis'];
    return names[Math.floor(Math.random() * names.length)];
  }

  applyConnected(isConnected = false) {
    const nc = 'Not connected.';
    this.el.$selfStateArea.text(isConnected ? `Your Peer id is ${this.peer.id}` : nc);
    this.el.$connectedArea.text(isConnected ? 'Connected.' : nc);
    this.el.$btnConnect.toggle(!isConnected);
    this.el.$btnDisconnect.toggle(isConnected);
    this.el.$cardArea.find('.card-panel').remove();
    this.el.$disableOnConnect.prop('disabled', isConnected).toggleClass('disabled', isConnected);
  }

  setDefaults() {
    this.applyConnected(false);

    /* set dispName */ {
      const defaultName = localStorage.getItem('dispName') || this.getRandomName();
      this.setDispName(defaultName);
      this.el.$tboxDispName.val(defaultName);
    }
    /* set apiKey */ {
      const apiKey = localStorage.getItem('apiKey') || '';
      this.setApiKey(apiKey);
      this.el.$tboxApiKey.val(apiKey);
    }
    /* set roomName */ {
      const roomName = localStorage.getItem('roomName') || 'webrtc-planning-porker-room';
      this.setRoomName(roomName);
      this.el.$tboxRoomName.val(roomName);
    }
  }

  getCard(id) {
    return $(`.card-${id}`);
  }

  setDispName(val) {
    const dispName = String(val).trim();
    if (!dispName) { return; }

    this.dispName = dispName;
    this.el.$selfNameArea.text(`Your Name is ${dispName}`);
    localStorage.setItem('dispName', dispName);
  }

  setApiKey(val) {
    const apiKey = String(val).trim();
    const keyStr = apiKey ? val : 'not set';
    this.el.$apiKeyArea.text(`Skyway api key is ${keyStr}`);

    this.apiKey = val;
    localStorage.setItem('apiKey', val);
  }

  setRoomName(val) {
    const roomName = String(val).trim();
    const roomStr = roomName ? val : 'not set';
    this.el.$roomNameArea.text(`Room is ${roomStr}`);

    this.roomName = val;
    localStorage.setItem('roomName', val);
  }

  putCard(num) {
    if (!this.peer) { return; }

    const data = { putCard: num, dispName: this.dispName };
    const $card = this.getCard(this.peer.id);
    if ($card.length !== 0) { return; }

    this.receivePutCard(this.peer.id, data);
    this.room.send(data);
  }

  receivePutCard(id, data) {
    const cardValue = data.putCard;
    const dispName  = data.dispName || id;
    const $card     = this.getCard(id);
    if (cardValue === undefined) { return; }
    if ($card.length !== 0)      { return; }

    this.el.$cardArea.append(`
      <span class="card-panel face-down card-${id}" data-value="${cardValue}" data-disp-name="${dispName}">
      </span>
    `);
  }

  pullCard() {
    if (!this.peer) { return; }
    const data = { pullCard: true };
    this.receivePullCard(this.peer.id, data);
    this.room.send(data);
  }

  receivePullCard(id, data) {
    if (!data.pullCard) { return; }
    const $card = this.getCard(id);
    $card.remove();
  }

  faceup() {
    if (!this.peer) { return; }
    const data = { faceup: true };
    this.receiveFaceup(this.peer.id, data);
    this.room.send(data);
  }

  receiveFaceup(id, data) {
    if (!data.faceup) { return; }

    const $card = this.getCard(id);
    const dispName  = $card.data('dispName');
    const cardValue = $card.data('value');

    $card.removeClass('face-down').addClass('face-up').html(`
      <svg width="100%" height="100%">
        <text x="50%" y="10%" font-size="1rem" text-anchor="middle">${dispName}</text>
        <text x="50%" y="50%" font-size="4.5rem" text-anchor="middle" dominant-baseline="middle">
          ${cardValue}
        </text>
        <rect fill="none" x="0%" y="0%" width="100%" height="100%" stroke-width="10" stroke="black">
      </svg>
    `);
  }

  facedown() {
    if (!this.peer) { return; }
    const data = { facedown: true };
    this.receiveFacedown(this.peer.id, data);
    this.room.send(data);
  }

  receiveFacedown(id, data) {
    if (!data.facedown) { return; }

    const $card = this.getCard(id);
    $card.removeClass('face-up').addClass('face-down').html('');
  }

  sendMessage() {
    if (!this.peer) { return; }

    const message = String(this.el.$tboxMsg.val()).trim();
    const data    = { message, dispName: this.dispName };
    if (!message) { return; }

    this.receiveMessage(this.peer.id, data);
    this.room.send(data);
    this.el.$tboxMsg.val('');
  }

  receiveMessage(id, data) {
    const message  = data.message;
    const dispName = data.dispName || id;
    if (!message) { return; }

    this.el.$chatArea.append(
      `<div class="card-panel teal">${dispName}:` +
        `<pre class="no-margin">${message}</pre>` +
      `</div>`
    );
    // scroll to bottom of chatArea.
    this.el.$chatAreaContainer.animate({
      scrollTop: this.el.$chatArea.height()
    }, 800);
  }

  notifyName(dispName) {
    if (!this.peer) { return; }

    this.room.send({ notifyName: true, dispName });
  }

  receiveNotifyName(id, data) {
    if (!data.notifyName) { return; }
    if (!data.dispName)   { return; }

    this.toast(`${data.dispName} joined.`);
  }

  memorizeName(id, data) {
    if (!(id && data.dispName)) { return; }
    if (!this.members) { this.members = {}; }
    this.members[id] = data.dispName;
  }

}
