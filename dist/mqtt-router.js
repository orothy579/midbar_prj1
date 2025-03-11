"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttRouter = void 0;
const mqtt_match_1 = __importDefault(require("mqtt-match"));
const zod_1 = __importDefault(require("zod"));
class MqttRouter {
    constructor() {
        this.routes = [];
    }
    match(path, arg1, arg2) {
        if (!arg2 && arg1 instanceof Function) {
            this.routes.push({ path, handler: arg1 });
        }
        if (arg1 instanceof zod_1.default.ZodType && arg2) {
            this.routes.push({ path, schema: arg1, handler: arg2 });
        }
    }
    getParam(filter, topic) {
        const idx = filter.split('/').indexOf('+');
        if (idx >= 0) {
            const parts = topic.split('/');
            return parts[idx];
        }
        return;
    }
    // handle(topic: string, schema?: z.ZodType, message: Buffer) {
    handle(topic, message) {
        const route = this.routes.find(({ path }) => (0, mqtt_match_1.default)(path, topic));
        if (route) {
            let param = this.getParam(route.path, topic);
            // if (route.path.endsWith('+')) {
            //   param = topic.replace(route.path.replace('+', ''), '')
            //   // console.log({param})
            // }
            try {
                let msg;
                try {
                    msg = JSON.parse(message.toString());
                }
                catch (err) {
                    msg = message.toString();
                }
                if (route.schema) {
                    msg = route.schema.parse(msg);
                }
                route.handler(msg, topic, param);
            }
            catch (err) {
                console.error(err);
            }
        }
    }
}
exports.MqttRouter = MqttRouter;
