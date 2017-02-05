import Express from 'express';
import React from 'react';
import ReactDOM from 'react-dom/server';
import path from 'path';
import {Provider} from 'react-redux';
import {StaticRouter} from 'react-router-dom';

import http from 'http';
// import compression from 'compression';
// import slash from 'express-slash';

import createStore from 'store/create';

import Log from '../../utils/log';

import ApiClient from '../helpers/ApiClient';
import Html from '../helpers/Html';
import Wrapper from '../wrapper';

export default function (parameters) {
    const app = new Express();

    app.use('/', Express.static(path.join(__ROOT_FOLDER__, 'webroot')));

    const server = new http.Server(app);


    const chunks = parameters.chunks();
    const log = Log('webpage renderer'); // eslint-disable-line

    app.use((req, res) => {
        const hydrateOnClient = () => {
            res.send(
                `<!doctype html>\n${ReactDOM.renderToString(<Html assets={chunks} />)}`
            );
        };

        const context = {};
        const client = new ApiClient(req);

        const store = createStore(client);

        global._env = {};

        if (configuration.disable_ssr) {
            hydrateOnClient();
            return;
        }

        const component = (
            <Provider store={store}>
                <StaticRouter
                    location={req.url}
                    context={context}
                >
                    <Wrapper locale={req.headers['accept-language']} />
                </StaticRouter>
            </Provider>
        );

        const content = ReactDOM.renderToString(
            <Html
                assets={chunks}
                component={component}
                store={store}
            />
        );

        if (context.url) {
            res.writeHead(302, {
              Location: context.url
            });
            res.end();

            return;
        }

        if (context.status) {
            res.status(context.status);
        } else {
            res.status(200);
        }

        for (const cookie of client.cookies) {
            res.set('Set-Cookie', cookie);
        }

        res.send(`<!doctype html>\n${content}`);
    });

    server.listen(configuration.server.http.port, (error) => {
        if (error) {
            log.error('Webpage rendering server shutdown due to an error', error);
            throw error;
        }

        log.info(`Webpage server is listening at http://localhost:${configuration.server.http.port}`);
    });
}