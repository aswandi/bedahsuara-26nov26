const net = require('node:net');
net.createServer(client => {
  const upstream = net.connect(3001, '127.0.0.1');
  client.on('error', () => upstream.destroy());
  upstream.on('error', () => client.destroy());
  client.pipe(upstream).pipe(client);
}).listen(3010, '100.102.175.102');
