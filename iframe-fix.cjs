/**
 * iframe-fix.cjs — Node.js preload script
 *
 * Intercepts OpenClaw's HTTP server to:
 * 1. Allow iframe embedding (strip X-Frame-Options, fix CSP)
 */
"use strict";

const http = require("http");

const origEmit = http.Server.prototype.emit;

http.Server.prototype.emit = function (event, ...args) {
  if (event === "request") {
    const [, res] = args;

    // Only intercept on the main OpenClaw server (port 7860)
    const serverPort = this.address && this.address() && this.address().port;
    if (serverPort && serverPort !== 7860) {
      return origEmit.apply(this, [event, ...args]);
    }

    // Fix iframe embedding — must be applied BEFORE any early returns
    const origWriteHead = res.writeHead;
    res.writeHead = function (statusCode, ...whArgs) {
      if (res.getHeader) {
        // Strip X-Frame-Options so it can load in a Hugging Face Space iframe
        res.removeHeader("x-frame-options");

        // Update Content-Security-Policy if it contains frame-ancestors 'none'
        const csp = res.getHeader("content-security-policy");
        if (csp && typeof csp === "string") {
          res.setHeader(
            "content-security-policy",
            csp.replace(
              /frame-ancestors\s+'none'/i,
              "frame-ancestors 'self' https://huggingface.co https://*.hf.space",
            ),
          );
        }
      }
      return origWriteHead.apply(this, [statusCode, ...whArgs]);
    };
  }

  return origEmit.apply(this, [event, ...args]);
};
