// Fix HF Spaces DNS: internal resolver can't resolve discord.com / api.telegram.org
// Override dns.lookup (used by http/https) to use Google/Cloudflare DNS
const dns = require('dns');
const { Resolver } = dns;
const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

const origLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = { family: 0 }; }
  resolver.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || !addresses.length) return origLookup.call(dns, hostname, options, callback);
    if (options && options.all) {
      callback(null, addresses.map(a => ({ address: a, family: 4 })));
    } else {
      callback(null, addresses[0], 4);
    }
  });
};
