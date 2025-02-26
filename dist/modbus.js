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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const modbus_serial_1 = __importDefault(require("modbus-serial"));
const mqtt_1 = __importDefault(require("mqtt"));
const pg_1 = require("pg");
const MQTT_BROKER_IP = process.env.MQTT_BROKER_IP || 'localhost';
const MQTT_URL = `mqtt://${MQTT_BROKER_IP}:1883`;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const SERIAL_PORT = '/dev/ttyV0';
const BAUD_RATE = 9600;
const SLAVE_ID = 0;
const REGISTER_START = 0;
const REGISTER_COUNT = 6;
// postgresql 연결
const dbPool = new pg_1.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});
// mqtt 클라이언트 생성
const mqttClient = mqtt_1.default.connect(MQTT_URL, {
    username: ACCESS_TOKEN,
});
// Modbus 클라이언트 생성
const modbusClient = new modbus_serial_1.default();
// 16bit 레지스터 값을 float(32bit)로 변환
function RegistersToFloats(registers) {
    const values = [];
    for (let i = 0; i < registers.length; i += 2) {
        const buffer = Buffer.alloc(4);
        buffer.writeUInt16BE(registers[i], 0); // MSB
        buffer.writeUInt16BE(registers[i + 1], 2); // LSB
        values.push(buffer.readFloatBE(0)); // Float 변환 후 배열에 저장
    }
    return values;
}
function initModbus() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!modbusClient.isOpen) {
                yield modbusClient.connectRTUBuffered(SERIAL_PORT, { baudRate: BAUD_RATE });
                modbusClient.setID(SLAVE_ID);
                console.log('Modbus connection successed');
            }
        }
        catch (error) {
            console.error('Modbus connection error:', error);
        }
    });
}
function saveTodb(data1, data2, data3) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const query = {
                text: 'INSERT INTO modbus_data(data1, data2, data3) VALUES($1, $2, $3)',
                values: [data1, data2, data3],
            };
            yield dbPool.query(query);
            console.log('Data saved to DB');
        }
        catch (error) {
            console.error('DB error:', error);
        }
    });
}
let prevData = null;
function readModbusData() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Reading modbus data...');
        try {
            if (!modbusClient.isOpen) {
                console.log('Modbus connection lost. Reconnecting...');
                yield initModbus();
            }
            // Reading holding register
            const data = yield modbusClient.readHoldingRegisters(REGISTER_START, REGISTER_COUNT);
            const floatData = RegistersToFloats(data.data);
            // console.log('Data:', floatData)
            // prevData가 null이면 최초 data 저장
            if (prevData === null) {
                prevData = floatData.slice(); // shallow copy
            }
            else {
                const payload = JSON.stringify({
                    data1: Math.abs(floatData[0] - prevData[0]),
                    data2: Math.abs(floatData[1] - prevData[1]),
                    data3: Math.abs(floatData[2] - prevData[2]),
                });
                // mqtt 로 data 전송
                mqttClient.publish('v1/devices/me/telemetry', payload, () => {
                    console.log(`Published: ${payload}`);
                });
                // postgresql에 data 저장
                yield saveTodb(Math.abs(floatData[0] - prevData[0]), Math.abs(floatData[1] - prevData[1]), Math.abs(floatData[2] - prevData[2]));
                // console.log(`current data : ${floatData[0]} prev data : ${prevData[0]}`)
                prevData = floatData.slice();
            }
        }
        catch (error) {
            console.error('Error reading modbus data:', error);
        }
    });
}
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        yield initModbus();
        setInterval(readModbusData, 5000);
    });
}
// master로서 slave 의 data를 받는다.
start();
mqttClient.on('connect', () => {
    console.log('Connected to ThingsBoard MQTT');
});
mqttClient.on('error', (err) => {
    console.error('MQTT error:', err);
});
