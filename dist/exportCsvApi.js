"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pg_1 = __importDefault(require("pg"));
const QueryStream = require("pg-query-stream");
const hono_1 = require("hono");
const node_server_1 = require("@hono/node-server");
const streaming_1 = require("hono/streaming");
const { Pool } = pg_1.default;
const dbPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});
const app = new hono_1.Hono();
// localhost:3000
app.get('/', (c) => {
    // 헤더 설정: 브라우저가 CSV 파일로 다운로드하도록 지정
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', 'attachment; filename="Data.csv"');
    return (0, streaming_1.stream)(c, (stream) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        const client = yield dbPool.connect();
        const query = new QueryStream('SELECT * FROM modbus_data ORDER BY id DESC');
        const result = client.query(query);
        // 스트림 중단
        stream.onAbort(() => {
            console.log('Aborted!');
        });
        let isFirstRow = true;
        try {
            // DB 스트림을 한 행씩 읽으면서 처리
            for (var _d = true, result_1 = __asyncValues(result), result_1_1; result_1_1 = yield result_1.next(), _a = result_1_1.done, !_a; _d = true) {
                _c = result_1_1.value;
                _d = false;
                const row = _c;
                if (isFirstRow) {
                    yield stream.write(Object.keys(row).join(',') + '\n'); //첫째 행이면 헤더 추가
                    isFirstRow = false;
                }
                yield stream.write(Object.values(row).join(',') + '\n');
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = result_1.return)) yield _b.call(result_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        client.release();
    }));
});
(0, node_server_1.serve)(app);
