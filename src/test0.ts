import dotenv from 'dotenv'
dotenv.config()
import ModbusRTU from 'modbus-serial'
import mqtt from 'mqtt'
import { Pool } from 'pg'

const MQTT_BROKER_IP = process.env.MQTT_BROKER_IP || 'localhost'
const MQTT_URL = `mqtt://${MQTT_BROKER_IP}:1883`
const ACCESS_TOKEN = process.env.ACCESS_TOKEN

const SERIAL_PORT = '/dev/ttyV0' // 시리얼포트 번호에 맞게 변해야 한다.
const BAUD_RATE = 9600 // baud rate에 맞게 변경해야 한다.
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

// mqtt 클라이언트 생성
const mqttClient = mqtt.connect(MQTT_URL, {
    username: ACCESS_TOKEN,
})

// Modbus 클라이언트 생성
const modbusClient = new ModbusRTU()

mqttClient.on('error', (err) => {
    console.error('MQTT error:', err)
})

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

async function saveTodb(data1: number, data2: number, data3: number) {
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

let prevData: number[] | null = null

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
        console.log('Data:', floatData)

        // prevData가 null이면 최초 data 저장
        if (prevData === null) {
            prevData = floatData.slice() // shallow copy
        } else {
            const payload = JSON.stringify({
                data1: Math.abs(floatData[0] - prevData[0]),
                data2: Math.abs(floatData[1] - prevData[1]),
                data3: Math.abs(floatData[2] - prevData[2]),
            })

            // mqtt 로 data 전송
            mqttClient.publish('v1/devices/me/telemetry', payload, () => {
                console.log(`Published: ${payload}`)
            })

            // postgresql에 data 저장
            await saveTodb(
                Math.abs(floatData[0] - prevData[0]),
                Math.abs(floatData[1] - prevData[1]),
                Math.abs(floatData[2] - prevData[2])
            )
            // console.log(`current data : ${floatData[0]} prev data : ${prevData[0]}`)
            prevData = floatData.slice()
        }
    } catch (error) {
        console.error('Error reading modbus data:', error)
    }
}

async function start() {
    await initModbus()
    setInterval(readModbusData, 5000)
}

// master로서 slave 의 data를 받는다.
start()
