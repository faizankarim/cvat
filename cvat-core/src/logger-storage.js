// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* global
    require:false
*/

const PluginRegistry = require('./plugins');
const server = require('./server-proxy');
const Log = require('./log');

class LoggerStorage {
    constructor() {
        this.clientID = Date.now().toString().substr(-6);
        this.collection = [];
    }

    async put(logType, wait, payload = {}) {
        const result = await PluginRegistry
            .apiWrapper.call(this, LoggerStorage.prototype.put, logType, wait, payload);
        return result;
    }

    async save() {
        const result = await PluginRegistry
            .apiWrapper.call(this, LoggerStorage.prototype.save);
        return result;
    }
}

LoggerStorage.prototype.put.implementation = function (logType, wait, payload) {
    const log = new Log(logType, { ...payload, client_id: this.clientID });
    if (wait) {
        log.onCloseCallback(() => {
            this.collection.push(log);
        });
    } else {
        this.collection.push(log);
    }

    return log;
};

LoggerStorage.prototype.save.implementation = async function () {
    await server.logs.save(this.collection.map((log) => log.dump()));
    this.collection = [];
};

module.exports = new LoggerStorage();
