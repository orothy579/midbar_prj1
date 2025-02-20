import dotenv from 'dotenv'
dotenv.config()
import ModbusRTU from 'modbus-serial'
import mqtt from 'mqtt'
import { Pool } from 'pg'

const MQTT_BROKER_IP = process.env.MQTT_BROKER_IP || 'localhost'
const MQTT_URL = `mqtt://${MQTT_BROKER_IP}:1883`
const ACCESS_TOKEN = process.env.ACCESS_TOKEN

const SERIAL_PORT = '/dev/ttyV0'
const BAUD_RATE = 9600
const SLAVE_ID = 0
const REGISTER_START = 0
const REGISTER_COUNT = 6

// postgresql 연결
const dbPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
})

// mqttClient 생성
const mqttClient = mqtt.connect(MQTT_URL, {
    username: ACCESS_TOKEN,
})

// Modbus 클라이언트 생성
const modbusClient = new ModbusRTU()

// 16bit 레지스터 값을 float(32bit)로 변환
function RegistersToFloats(registers: number[]): number[] {
    const values: number[] = []
    for (let i = 0; i < registers.length; i += 2) {
        const buffer = Buffer.alloc(4)
        buffer.writeUInt16BE(registers[i], 0) // MSB
        buffer.writeUInt16BE(registers[i + 1], 2) // LSB
        values.push(buffer.readFloatBE(0)) // Float 변환 후 배열에 저장
    }
    return values
}

async function initModbus() {
    try {
        if (!modbusClient.isOpen) {
            await modbusClient.connectRTUBuffered(SERIAL_PORT, { baudRate: BAUD_RATE })
            modbusClient.setID(SLAVE_ID)
            console.log('Modbus connection successed')
        }
    } catch (error) {
        console.error('Modbus connection error:', error)
    }
}

async function saveToDb(data1: number, data2: number, data3: number) {
    try {
        const query = {
            text: 'INSERT INTO modbus_data(data1, data2, data3) VALUES($1, $2, $3)',
            values: [data1, data2, data3],
        }
        await dbPool.query(query)
        console.log('Data saved to DB')
    } catch (error) {
        console.error('DB error:', error)
    }
}

async function readModbusData() {
    console.log('Reading modbus data...')
    try {
        if (!modbusClient.isOpen) {
            console.log('Modbus connection lost. Reconnecting...')
            await initModbus()
        }
        // Reading holding register
        const data = await modbusClient.readHoldingRegisters(REGISTER_START, REGISTER_COUNT)
        const floatData = RegistersToFloats(data.data)
        // console.log('Data:', floatData)

        const payload = JSON.stringify({
            data1: floatData[0],
            data2: floatData[1],
            data3: floatData[2],
        })

        // mqtt 로 data 전송
        mqttClient.publish('v1/devices/me/telemetry', payload, () => {
            console.log(`Published: ${payload}`)
        })

        // postgresql에 data 저장
        await saveToDb(floatData[0], floatData[1], floatData[2])
    } catch (error) {
        console.error('Error reading modbus data:', error)
    }
}

async function startPolling() {
    await initModbus()
    setInterval(readModbusData, 1000)
}

// master로서 slave 의 data polling 시도
startPolling()

mqttClient.on('connect', () => {
    console.log('Connected to ThingsBoard MQTT')
})

mqttClient.on('error', (err) => {
    console.error('MQTT error:', err)
})
