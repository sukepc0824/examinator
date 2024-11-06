function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateShortID() {
  var S = "abcdefghijklmnopqrstuvwxyz0123456789"
  var N = 7
  return Array.from(crypto.getRandomValues(new Uint8Array(N))).map((n) => S[n % S.length]).join('')
}