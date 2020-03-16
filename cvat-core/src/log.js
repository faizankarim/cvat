/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

const PluginRegistry = require('./plugins');
const { ArgumentError } = require('./exceptions');
const { LogType } = require('./enums');

/**
    * Class representing a single log
    * @memberof module:API.cvat.classes
    * @hideconstructor
*/
class Log {
    constructor(logType, isDurable, payload) {
        try {
            JSON.stringify(payload);
        } catch (error) {
            const message = `Log payload must be JSON serializable. ${error.toString()}`;
            throw new ArgumentError(message);
        }

        this.type = logType;
        this.isDurable = isDurable;
        this.payload = { ...payload };
        this.onCloseCallback = null;
        this.time = new Date();
        this.isActive = typeof (window) !== 'undefined' ? window.document.hasFocus() : undefined;
    }

    onClose(callback) {
        this.onCloseCallback = callback;
    }

    dump() {
        const payload = { ...this.payload };
        const body = {
            name: this.type,
            time: this.time.toISOString(),
        };

        if (typeof (this.isActive) !== 'undefined') {
            body.is_active = this.isActive;
        }

        if ('client_id' in payload) {
            body.client_id = payload.client_id;
            delete payload.client_id;
        }

        if ('job_id' in payload) {
            body.job_id = payload.job_id;
            delete payload.job_id;
        }

        if ('task_id' in payload) {
            body.task_id = payload.task_id;
            delete payload.task_id;
        }

        return {
            ...body,
            payload,
        };
    }

    /**
        * Method saves a log in a storage
        * @method close
        * @memberof module:API.cvat.classes.Log
        * @param {string} [payload] part of payload can be added when close a log
        * @readonly
        * @instance
        * @async
        * @throws {module:API.cvat.exceptions.PluginError}
        * @throws {module:API.cvat.exceptions.ArgumentError}
    */
    async close(payload = {}) {
        const result = await PluginRegistry
            .apiWrapper.call(this, Log.prototype.close, payload);
        return result;
    }
}

Log.prototype.close.implementation = function (payload) {
    if (typeof (payload) !== 'object') {
        throw new ArgumentError('Payload must be an object');
    }

    try {
        JSON.stringify(payload);
    } catch (error) {
        const message = `Log payload must be JSON serializable. ${error.toString()}`;
        throw new ArgumentError(message);
    }

    this.payload.duration = Date.now() - this.time.getTime();
    this.payload = { ...this.payload, ...payload };

    if (this.onCloseCallback) {
        this.onCloseCallback();
    }
};

module.exports = Log;

class DeleteObjectLog extends Log {
    constructor(logType, isDurable, payload) {
        super(logType, isDurable, payload);
        if (!Number.isInteger(payload.count) || payload.count < 1) {
            const message = `The field "count" is required for "${logType}" log`
                + 'It must be a positive integer';
            throw new ArgumentError(message);
        }
    }
}

class SendTaskInfoLog extends Log {
    constructor(logType, isDurable, payload) {
        super(logType, isDurable, payload);

        function generateError(name, range) {
            const message = `The field "${name}" is required for "${logType}" log. ${range}`;
            throw new ArgumentError(message);
        }
        if (!Number.isInteger(payload['track count']) || payload['track count'] < 0) {
            generateError('track count', 'It must be an integer not less than 0');
        }

        if (!Number.isInteger(payload['frame count']) || payload['frame count'] < 1) {
            generateError('frame count', 'It must be an integer not less than 1');
        }

        if (!Number.isInteger(payload['object count']) || payload['object count'] < 0) {
            generateError('object count', 'It must be an integer not less than 0');
        }

        if (!Number.isInteger(payload['box count']) || payload['box count'] < 0) {
            generateError('box count', 'It must be an integer not less than 0');
        }

        if (!Number.isInteger(payload['polygon count']) || payload['polygon count'] < 0) {
            generateError('polygon count', 'It must be an integer not less than 0');
        }

        if (!Number.isInteger(payload['polyline count']) || payload['polyline count'] < 0) {
            generateError('polyline count', 'It must be an integer not less than 0');
        }

        if (!Number.isInteger(payload['points count']) || payload['points count'] < 0) {
            generateError('points count', 'It must be an integer not less than 0');
        }
    }
}

function logFactory(logType, isDurable, payload) {
    if (logType === LogType.deleteObject) {
        return new DeleteObjectLog(logType, isDurable, payload);
    }
    if (logType === LogType.sendTaskInfo) {
        return new SendTaskInfoLog(logType, isDurable, payload);
    }
    if (logType === LogType.loadJob) {
        // dumped as "Load job". "track count", "frame count", "object count"
        // are required fields.
    } else if (logType === LogType.mergeObjects) {
        // dumped as "Merge objects". "count" is required field with positive or
        // negative number value.
    } else if (logType === LogType.copyObject) {
        // dumped as "Copy object". "count" is required field with number value.
    } else if (logType === LogType.propagateObject) {
        // dumped as "Copy object". "count" is required field with number value.
    } else if (logType === LogType.undoAction) {
        // dumped as "Copy object". "count" is required field with positive or
        // negative number value.
    } else if (logType === LogType.redoAction) {
        // dumped as "Copy object". "count" is required field with positive or
        // negative number value.
    } else if (logType === LogType.sendUserActivity) {
        // dumped as "Send user activity". "working_time" is required field with
        // positive number value.
    } else if (logType === LogType.sendException) {
        // dumped as "Send exception". Use to send any exception events to the
        // server. "message", "filename", "line" are mandatory fields. "stack"
        // and "column" are optional.
    } else {
        return new Log(logType, isDurable, payload);
    }
}
