import { setupOutgoing, setupSocket } from '../src/proxy/common';
import { describe, expect, it } from 'vitest';

describe('src/proxy/common.ts', () => {
    describe('#setupOutgoing', () => {
        it('should setup the correct headers', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    agent: '?',
                    target: {
                        host: 'hey',
                        hostname: 'how',
                        socketPath: 'are',
                        port: 'you',
                    },
                    headers: { fizz: 'bang', overwritten: true },
                    localAddress: 'local.address',
                    auth: 'username:pass',
                },
                {
                    method: 'i',
                    url: 'am',
                    headers: { pro: 'xy', overwritten: false },
                },
            );

            expect(outgoing.host).toEqual('hey');
            expect(outgoing.hostname).toEqual('how');
            expect(outgoing.socketPath).toEqual('are');
            expect(outgoing.port).toEqual('you');
            expect(outgoing.agent).toEqual('?');

            expect(outgoing.method).toEqual('i');
            expect(outgoing.path).toEqual('/am');

            expect(outgoing.headers.pro).toEqual('xy');
            expect(outgoing.headers.fizz).toEqual('bang');
            expect(outgoing.headers.overwritten).toEqual(true);
            expect(outgoing.localAddress).toEqual('local.address');
            expect(outgoing.auth).toEqual('username:pass');
        });

        it('should not override agentless upgrade header', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    agent: undefined,
                    target: {
                        host: 'hey',
                        hostname: 'how',
                        socketPath: 'are',
                        port: 'you',
                    },
                    headers: { connection: 'upgrade' },
                },
                {
                    method: 'i',
                    url: 'am',
                    headers: { pro: 'xy', overwritten: false },
                },
            );
            expect(outgoing.headers.connection).toEqual('upgrade');
        });

        it('should not override agentless connection: contains upgrade', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    agent: undefined,
                    target: {
                        host: 'hey',
                        hostname: 'how',
                        socketPath: 'are',
                        port: 'you',
                    },
                    headers: { connection: 'keep-alive, upgrade' }, // this is what Firefox sets
                },
                {
                    method: 'i',
                    url: 'am',
                    headers: { pro: 'xy', overwritten: false },
                },
            );
            expect(outgoing.headers.connection).toEqual('keep-alive, upgrade');
        });

        it('should override agentless connection: contains improper upgrade', () => {
            // sanity check on upgrade regex
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    agent: undefined,
                    target: {
                        host: 'hey',
                        hostname: 'how',
                        socketPath: 'are',
                        port: 'you',
                    },
                    headers: { connection: 'keep-alive, not upgrade' },
                },
                {
                    method: 'i',
                    url: 'am',
                    headers: { pro: 'xy', overwritten: false },
                },
            );
            expect(outgoing.headers.connection).toEqual('close');
        });

        it('should override agentless non-upgrade header to close', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    agent: undefined,
                    target: {
                        host: 'hey',
                        hostname: 'how',
                        socketPath: 'are',
                        port: 'you',
                    },
                    headers: { connection: 'xyz' },
                },
                {
                    method: 'i',
                    url: 'am',
                    headers: { pro: 'xy', overwritten: false },
                },
            );
            expect(outgoing.headers.connection).toEqual('close');
        });

        it('should set the agent to false if none is given', () => {
            const outgoing = {};
            setupOutgoing(outgoing, { target: new URL('http://localhost') }, { url: '/' });
            expect(outgoing.agent).toEqual(false);
        });

        it('set the port according to the protocol', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    agent: '?',
                    target: {
                        host: 'how',
                        hostname: 'are',
                        socketPath: 'you',
                        protocol: 'https:',
                    },
                },
                {
                    method: 'i',
                    url: 'am',
                    headers: { pro: 'xy' },
                },
            );

            expect(outgoing.host).toEqual('how');
            expect(outgoing.hostname).toEqual('are');
            expect(outgoing.socketPath).toEqual('you');
            expect(outgoing.agent).toEqual('?');

            expect(outgoing.method).toEqual('i');
            expect(outgoing.path).toEqual('/am');
            expect(outgoing.headers.pro).toEqual('xy');

            expect(outgoing.port).toEqual(443);
        });

        it('should keep the original target path in the outgoing path', () => {
            const outgoing = {};
            setupOutgoing(outgoing, { target: { path: 'some-path' } }, { url: 'am' });

            expect(outgoing.path).toEqual('some-path/am');
        });

        it('should keep the original forward path in the outgoing path', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    target: {},
                    forward: {
                        path: 'some-path',
                    },
                },
                {
                    url: 'am',
                },
                'forward',
            );

            expect(outgoing.path).toEqual('some-path/am');
        });

        it('should properly detect https/wss protocol without the colon', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    target: {
                        protocol: 'https',
                        host: 'whatever.com',
                    },
                },
                { url: '/' },
            );

            expect(outgoing.port).toEqual(443);
        });

        it('should not prepend the target path to the outgoing path with prependPath = false', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    target: { path: 'hellothere' },
                    prependPath: false,
                },
                { url: 'hi' },
            );

            expect(outgoing.path).toEqual('/hi');
        });

        it('should properly join paths', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    target: { path: '/forward' },
                },
                { url: '/static/path' },
            );

            expect(outgoing.path).toEqual('/forward/static/path');
        });

        it('should not modify the query string', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    target: { path: '/forward' },
                },
                { url: '/?foo=bar//&target=http://foobar.com/?a=1%26b=2&other=2' },
            );

            expect(outgoing.path).toEqual(
                '/forward/?foo=bar//&target=http://foobar.com/?a=1%26b=2&other=2',
            );
        });

        //
        // This is the proper failing test case for the common.join problem
        //
        it.skip('should correctly format the toProxy URL', () => {
            const outgoing = {};
            const google = 'https://google.com';
            setupOutgoing(
                outgoing,
                {
                    target: new URL('http://sometarget.com:80'),
                    toProxy: true,
                },
                { url: google },
            );

            expect(outgoing.path).toEqual('//' + google);
        });

        it.skip('should not replace : to :\\ when no https word before', () => {
            const outgoing = {};
            const google = 'https://google.com:/join/join.js';
            setupOutgoing(
                outgoing,
                {
                    target: new URL('http://sometarget.com:80'),
                    toProxy: true,
                },
                { url: google },
            );

            expect(outgoing.path).toEqual('/' + google);
        });

        it.skip('should not replace : to :\\ when no http word before', () => {
            const outgoing = {};
            const google = 'http://google.com:/join/join.js';
            setupOutgoing(
                outgoing,
                {
                    target: new URL('http://sometarget.com:80'),
                    toProxy: true,
                },
                { url: google },
            );

            expect(outgoing.path).toEqual('/' + google);
        });

        describe('when using ignorePath', () => {
            it('should ignore the path of the `req.url` passed in but use the target path', () => {
                const outgoing = {};
                const myEndpoint = 'https://whatever.com/some/crazy/path/whoooo';
                setupOutgoing(
                    outgoing,
                    {
                        target: new URL(myEndpoint),
                        ignorePath: true,
                    },
                    { url: '/more/crazy/pathness' },
                );

                expect(outgoing.path).toEqual('/some/crazy/path/whoooo');
            });

            it('and prependPath: false, it should ignore path of target and incoming request', () => {
                const outgoing = {};
                const myEndpoint = 'https://whatever.com/some/crazy/path/whoooo';
                setupOutgoing(
                    outgoing,
                    {
                        target: new URL(myEndpoint),
                        ignorePath: true,
                        prependPath: false,
                    },
                    { url: '/more/crazy/pathness' },
                );

                expect(outgoing.path).toEqual('');
            });
        });

        describe('when using changeOrigin', () => {
            it('should correctly set the port to the host when it is a non-standard port using new URL()', () => {
                const outgoing = {};
                const myEndpoint = 'https://myCouch.com:6984';
                setupOutgoing(
                    outgoing,
                    {
                        target: new URL(myEndpoint),
                        changeOrigin: true,
                    },
                    { url: '/' },
                );

                expect(outgoing.headers.host).toEqual('mycouch.com:6984');
            });

            it('should correctly set the port to the host when it is a non-standard port when setting host and port manually (which ignores port)', () => {
                const outgoing = {};
                setupOutgoing(
                    outgoing,
                    {
                        target: {
                            protocol: 'https:',
                            host: 'mycouch.com',
                            port: 6984,
                        },
                        changeOrigin: true,
                    },
                    { url: '/' },
                );
                expect(outgoing.headers.host).toEqual('mycouch.com:6984');
            });
        });

        it('should pass through https client parameters', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    agent: '?',
                    target: {
                        host: 'how',
                        hostname: 'are',
                        socketPath: 'you',
                        protocol: 'https:',
                        pfx: 'my-pfx',
                        key: 'my-key',
                        passphrase: 'my-passphrase',
                        cert: 'my-cert',
                        ca: 'my-ca',
                        ciphers: 'my-ciphers',
                        secureProtocol: 'my-secure-protocol',
                    },
                },
                {
                    method: 'i',
                    url: 'am',
                },
            );

            expect(outgoing.pfx).toEqual('my-pfx');
            expect(outgoing.key).toEqual('my-key');
            expect(outgoing.passphrase).toEqual('my-passphrase');
            expect(outgoing.cert).toEqual('my-cert');
            expect(outgoing.ca).toEqual('my-ca');
            expect(outgoing.ciphers).toEqual('my-ciphers');
            expect(outgoing.secureProtocol).toEqual('my-secure-protocol');
        });

        it('should handle overriding the `method` of the http request', () => {
            const outgoing = {};
            setupOutgoing(
                outgoing,
                {
                    target: new URL('https://whooooo.com'),
                    method: 'POST',
                },
                { method: 'GET', url: '' },
            );

            expect(outgoing.method).toEqual('POST');
        });

        // new URL() => null
        it('should not pass null as last arg to #urlJoin', () => {
            const outgoing = {};
            setupOutgoing(outgoing, { target: { path: '' } }, { url: '' });

            expect(outgoing.path).toBe('/');
        });

        it('should pass through lookup', () => {
            const outgoing = {};
            function lookup(hostname, options, callback) {
                callback('This is just a test');
            }
            setupOutgoing(outgoing, {
                target: new URL('http://example.com'),
                lookup: lookup,
            }, { url: '' });
            expect(outgoing.lookup).toBe(lookup);
        });
    });

    describe('#setupSocket', () => {
        it('should setup a socket', () => {
            const socketConfig = {
                timeout: null,
                nodelay: false,
                keepalive: false,
            },
                stubSocket = {
                    setTimeout: function (num) {
                        socketConfig.timeout = num;
                    },
                    setNoDelay: function (bol) {
                        socketConfig.nodelay = bol;
                    },
                    setKeepAlive: function (bol) {
                        socketConfig.keepalive = bol;
                    },
                };
            setupSocket(stubSocket);

            expect(socketConfig.timeout).toEqual(0);
            expect(socketConfig.nodelay).toEqual(true);
            expect(socketConfig.keepalive).toEqual(true);
        });
    });
});
