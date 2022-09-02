import * as url from "url";
import * as net from "net";
import * as http from 'http';
import * as https from 'https';
import * as buffer from 'buffer';
import * as followRedirects from 'follow-redirects';
import { ProxyServer } from './proxy'

export interface ProxyTargetDetailed {
    host: string;
    port: number;
    href?: string;
    method?: string;
    protocol?: string;
    hostname?: string;
    socketPath?: string;
    key?: string;
    passphrase?: string;
    pfx?: buffer.Buffer | string;
    cert?: string | buffer.Buffer | Array<string | buffer.Buffer>;
    ca?: string | buffer.Buffer | Array<string | buffer.Buffer>;
    ciphers?: string;
    secureProtocol?: string;
    servername?: string;
    searchParams?: string | url.URLSearchParams;
    pathname?: string;
    path?: string;
}

export interface OutgoingOptions extends ProxyTargetDetailed, followRedirects.FollowOptions<Server.followOptions> {
    localAddress?: string;
    headers?: Server.ServerOptions['headers'];
    agent?: Server.ServerOptions['agent'];
    auth?: Server.ServerOptions['auth'];
    rejectUnauthorized?: boolean;
}

export interface Passthrough {
    (req: http.IncomingMessage, res: http.ServerResponse): boolean | void;
    (req: http.IncomingMessage, res: http.ServerResponse | net.Socket, head?: buffer.Buffer): boolean | void;
    (req: http.IncomingMessage, res: http.ServerResponse, options: Server.ServerOptions, head?: buffer.Buffer, server?: ProxyServer, callback?: ( err?: Error, req?: http.IncomingMessage, res?: http.ServerResponse, url?: Server.ServerOptions['target'] ) => void ): boolean | void;
}

export declare namespace Server {
    type ProxyTarget = ProxyTargetUrl | url.URL & ProxyTargetDetailed;
    type ProxyTargetUrl = Partial<url.URL & ProxyTargetDetailed>;
    type followOptions = {}

    export interface ServerOptions {
        /** URL string to be parsed with the url module. */
        target?: string | ProxyTarget;
        /** URL string to be parsed with the url module. */
        forward?: string | ProxyTarget;
        /** Object to be passed to http(s).request. */
        agent?: http.Agent | boolean;
        /** Object to be passed to https.createServer(). */
        ssl?: https.ServerOptions;
        /** If you want to proxy websockets. */
        ws?: boolean;
        /** Adds x- forward headers. */
        xfwd?: boolean;
        /** Verify SSL certificate. */
        secure?: boolean;
        /** Explicitly specify if we are proxying to another proxy. */
        toProxy?: boolean;
        /** Specify whether you want to prepend the target's path to the proxy path. */
        prependPath?: boolean;
        /** Specify whether you want to ignore the proxy path of the incoming request. */
        ignorePath?: boolean;
        /** Local interface string to bind for outgoing connections. */
        localAddress?: string;
        /** Changes the origin of the host header to the target URL. */
        changeOrigin?: boolean;
        /** specify whether you want to keep letter case of response header key */
        preserveHeaderKeyCase?: boolean;
        /** Basic authentication i.e. 'user:password' to compute an Authorization header. */
        auth?: string;
        /** Rewrites the location hostname on (301 / 302 / 307 / 308) redirects, Default: null. */
        hostRewrite?: string;
        /** Rewrites the location host/ port on (301 / 302 / 307 / 308) redirects based on requested host/ port.Default: false. */
        autoRewrite?: boolean;
        /** Rewrites the location protocol on (301 / 302 / 307 / 308) redirects to 'http' or 'https'.Default: null. */
        protocolRewrite?: string;
        /** rewrites domain of set-cookie headers. */
        cookieDomainRewrite?: false | string | Record<string, unknown>;
        /** rewrites path of set-cookie headers. Default: false */
        cookiePathRewrite?: false | string | Record<string, unknown>;
        /** specify if you want to remove the secure flag from the cookie */
        cookieRemoveSecure?: boolean;
        /** allows to merge `set-cookie` headers from passed response and response from target. Default: false. */
        mergeCookies?: boolean;
        /** object with extra headers to be added to target requests. */
        headers?: Record<string, unknown> | http.IncomingHttpHeaders;
        /** object with extra headers to be added to proxy requests. */
        outgoingHeaders?: Record<string, string | number | readonly string[]> | http.IncomingHttpHeaders;
        /** Timeout (in milliseconds) when proxy receives no response from target. Default: 120000 (2 minutes) */
        proxyTimeout?: number;
        /** */
        router?: Record<string, unknown>;
        /** Timeout (in milliseconds) for incoming requests */
        timeout?: number;
        /** Specify whether you want to follow redirects. Default: false */
        followRedirects?: followRedirects.FollowOptions<followOptions>;
        /** if set to true the web passes will be run even if `selfHandleResponse` is also set to true. */
        forcePasses?: boolean;
        /** If set to true, none of the webOutgoing passes are called and it's your responsibility to appropriately return the response by listening and acting on the proxyRes event */
        selfHandleResponse?: boolean | Function;
        /** if set, this function will be called with three arguments `req`, `proxyReq` and `proxyRes` and should return a Duplex stream, data from the client websocket will be piped through this stream before being piped to the server, allowing you to influence the request data. */
        createWsClientTransformStream?: ( req: http.IncomingMessage, proxyReq: http.ClientRequest, proxyRes: http.IncomingMessage ) => net.Socket;
        /** if set, this function will be called with three arguments `req`, `proxyReq` and `proxyRes` and should return a Duplex stream, data from the server websocket will be piped through this stream before being piped to the client, allowing you to influence the response data. */
        createWsServerTransformStream?: ( req: http.IncomingMessage, proxyReq: http.ClientRequest, proxyRes: http.IncomingMessage ) => net.Socket;
        /** Buffer */
        buffer?: buffer.Buffer;
    }

    type StartCallback<TIncomingMessage = http.IncomingMessage, TServerResponse = http.ServerResponse> = (req: TIncomingMessage, res: TServerResponse, target: ProxyTargetUrl ) => void;
    type ProxyReqCallback<TClientRequest = http.ClientRequest, TIncomingMessage = http.IncomingMessage, TServerResponse = http.ServerResponse> = (proxyReq: TClientRequest, req: TIncomingMessage, res: TServerResponse, options: ServerOptions) => void;
    type ProxyResCallback<TIncomingMessage = http.IncomingMessage, TServerResponse = http.ServerResponse> = (proxyRes: TIncomingMessage, req: TIncomingMessage, res: TServerResponse) => void;
    type ProxyReqWsCallback<TClientRequest = http.ClientRequest, TIncomingMessage = http.IncomingMessage> = (
        proxyReq: TClientRequest,
        req: TIncomingMessage,
        socket: net.Socket,
        options: ServerOptions,
        head: buffer.Buffer,
        asyncContext: (cb: Promise<any>) => void,
    ) => void;
    type EconnresetCallback<TError = Error, TIncomingMessage = http.IncomingMessage, TServerResponse = http.ServerResponse> = (
        err: TError,
        req: TIncomingMessage,
        res: TServerResponse,
        target: ProxyTargetUrl,
    ) => void;
    type EndCallback<TIncomingMessage = http.IncomingMessage, TServerResponse = http.ServerResponse> = (
        req: TIncomingMessage,
        res: TServerResponse,
        proxyRes: TIncomingMessage
    ) => void;
    type OpenCallback = (proxySocket: net.Socket) => void;
    type CloseCallback<TIncomingMessage = http.IncomingMessage> = (proxyRes: TIncomingMessage, proxySocket: net.Socket, proxyHead: any) => void;
    type ErrorCallback<TError = Error, TIncomingMessage = http.IncomingMessage, TServerResponse = http.ServerResponse> = (
        err: TError,
        req: TIncomingMessage,
        res: TServerResponse | net.Socket,
        target?: ProxyTargetUrl,
    ) => void;
}